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
    this.stream = this.mixer_control.get_default_source();
    let was_active = this.active;
    this.active = false;
    if (this.stream) {
      this.muted_changed_id = this.stream.connect(
        'notify::is-muted', Lang.bind(this, this.update));
      let recording_apps = this.mixer_control.get_source_outputs();
      for (let i = 0; i < recording_apps.length; i++) {
        let outputStream = recording_apps[i];
        let id = outputStream.get_application_id();
        if (!id || (id != 'org.gnome.VolumeControl' && id != 'org.PulseAudio.pavucontrol')) {
          this.active = true;
        }
      }
    }
    if (was_active === null)
      return;
    if (this.active == was_active)
      return;
    this.emit(this.active ? 'activated' : 'deactivated');
  },

  get muted() {
    return this.stream && this.stream.is_muted;
  },

  set muted(muted) {
    if (this.stream)
      this.stream.change_is_muted(muted);
  }
});
Signals.addSignalMethods(Microphone.prototype);


let microphone;
let button, icon;

function get_stream() {
  let control = Main.panel.statusArea.aggregateMenu._volume._control;
  return control.get_default_source();
}

function update_icon(muted) {
  let stream = get_stream();
  if (!stream)
    return;
  if (muted) {
    icon.icon_name = 'microphone-sensitivity-muted-symbolic';
  } else {
    icon.icon_name = 'microphone-sensitivity-high-symbolic';
  }
}


function change_muted_state(muted) {
  microphone.muted = muted;
  update_icon(muted);
  show_osd(muted ? "Microphone muted" : "Microphone unmuted", muted);
}

function unmute() {
    microphone.muted = false;
    update_icon(false);
    show_osd("Microphone unmuted", true);
}


let mute_timeout_id = 0;

function on_activate(widget, event) {
  if (microphone.muted) {
    change_muted_state(true);
  } else {
    if (mute_timeout_id > 0)
      Mainloop.source_remove(mute_timeout_id);
    mute_timeout_id = Mainloop.timeout_add(
      1000,
      function() {
        mute_timeout_id = 0;
        change_muted_state(false);
      });
  }
}

function show_debug(text) {
  Main.osdWindowManager.show(-1, Gio.Icon.new_for_string(""), text);
}

function show_osd(text, active) {
  let monitor = -1;
  let icon_name = active ? 'microphone-sensitivity-high-symbolic' : 'microphone-sensitivity-muted-symbolic';
  Main.osdWindowManager.show(
    monitor,
    Gio.Icon.new_for_string(icon_name),
    text);
}

function init() {
  keybindings = (new Settings.Keybindings()).settings;
  button = new St.Bin({
    style_class: 'panel-button',
    reactive: true,
    can_focus: true,
    x_fill: true,
    y_fill: false,
    track_hover: true});
  icon = new St.Icon({
    icon_name: 'microphone-sensitivity-high-symbolic',
    style_class: 'system-status-icon'});
  let stream = get_stream();
  if (stream)
    update_icon(stream.is_muted);
  button.set_child(icon);
  button.connect('button-press-event', on_activate);

  microphone = new Microphone();
  microphone.connect('activated', function() {
    show_osd("Microphone activated", true);
  });
  microphone.connect('deactivated', function() {
    show_osd("Microphone deactivated", false);
  });
}

function enable() {
  Main.panel._rightBox.insert_child_at_index(button, 0);
  Main.wm.addKeybinding(
    'keybinding-toggle-mute',
    keybindings,
    Meta.KeyBindingFlags.NONE,
    Shell["ActionMode"].NORMAL | Shell["ActionMode"].MESSAGE_TRAY,
    on_activate);
}

function disable() {
  Main.panel._rightBox.remove_child(button);
}
