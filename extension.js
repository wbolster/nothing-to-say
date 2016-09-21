const Gio = imports.gi.Gio;
const Gvc = imports.gi.Gvc;
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;

let keybindings;

const Microphone = new Lang.Class({
  Name: 'Microphone',

  _init: function() {
    this.active = null;
    this.stream = null;
    this.muted_changed_id = 0;
    this.mixer_control = new Gvc.MixerControl({name: 'Nothing to say'});
    this.mixer_control.open();
    this.mixer_control.connect('default-source-changed', Lang.bind(this, this.update));
    this.mixer_control.connect('stream-added', Lang.bind(this, this.update));
    this.mixer_control.connect('stream-removed', Lang.bind(this, this.update));
    this.update();
  },

  update: function() {
    // based on gnome-shell volume control
    if (this.stream && this.muted_changed_id) {
      this.stream.disconnect(this.muted_changed_id);
    }
    let was_active = this.active;
    this.active = false;
    this.stream = this.mixer_control.get_default_source();
    if (this.stream) {
      this.muted_changed_id = this.stream.connect(
        'notify::is-muted', Lang.bind(this, this.notify_muted));
      let recording_apps = this.mixer_control.get_source_outputs();
      for (let i = 0; i < recording_apps.length; i++) {
        let outputStream = recording_apps[i];
        let id = outputStream.get_application_id();
        if (!id || (id != 'org.gnome.VolumeControl' && id != 'org.PulseAudio.pavucontrol')) {
          this.active = true;
        }
      }
    }
    this.emit('notify::muted');
    if (this.active != was_active)
        this.emit('notify::active');
  },

  notify_muted: function() {
    this.emit('notify::muted');
  },

  get muted() {
    return this.stream && this.stream.is_muted;
  },

  set muted(muted) {
    if (!this.stream)
      return;
    this.stream.change_is_muted(muted);
  },

  get level() {
    if (!this.stream)
        return 0;
    return 100 * this.stream.get_volume() / this.mixer_control.get_vol_max_norm();
  }
});
Signals.addSignalMethods(Microphone.prototype);


let microphone;
let button, icon;
let initialised = false;

function show_osd(text, muted, level) {
  let monitor = -1;
  let icon_name = muted ? 'microphone-sensitivity-muted-symbolic' : 'microphone-sensitivity-high-symbolic';
  Main.osdWindowManager.show(
    monitor,
    Gio.Icon.new_for_string(icon_name),
    text,
    level);
}

function update_icon(muted) {
  let icon_name = muted ? 'microphone-sensitivity-muted-symbolic' : 'microphone-sensitivity-high-symbolic';
  icon.icon_name = icon_name;
}

let mute_timeout_id = 0;

function on_activate(widget, event) {
  if (microphone.muted) {
    microphone.muted = false;
    show_osd("Microphone unmuted", false, microphone.level);
  } else {
    if (mute_timeout_id > 0) {
      Mainloop.source_remove(mute_timeout_id);
      show_osd("Microphone unmuted", false, microphone.level);
    }
    mute_timeout_id = Mainloop.timeout_add(
      100,
      function() {
        mute_timeout_id = 0;
        microphone.muted = true;
        show_osd("Microphone muted", true, 0);
      });
  }
}

function init() {

  microphone = new Microphone();
  keybindings = (new Settings.Keybindings()).settings;
  icon = new St.Icon({
    icon_name: 'microphone-sensitivity-high-symbolic',
    style_class: 'system-status-icon'});
  update_icon(microphone.muted);
  button = new St.Bin({
    style_class: 'panel-button',
    reactive: true,
    can_focus: true,
    x_fill: true,
    y_fill: false,
    track_hover: true,
    visible: microphone.active});
  button.set_child(icon);
  button.connect('button-press-event', on_activate);
  microphone.connect('notify::active', function() {
    button.visible = microphone.active;
    if (initialised || microphone.active)
      show_osd(
        microphone.active ? "Microphone activated" : "Microphone deactivated",
        microphone.muted);
    initialised = true;
  });
  microphone.connect('notify::muted', function () {
    update_icon(microphone.muted);
  });
}

function enable() {
  Main.panel._rightBox.insert_child_at_index(button, 0);
  Main.wm.addKeybinding(
    'keybinding-toggle-mute',
    keybindings,
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL | Shell.ActionMode.MESSAGE_TRAY,
    on_activate);
}

function disable() {
  Main.panel._rightBox.remove_child(button);
  Main.wm.removeKeybinding('keybinding-toggle-mute');
}
