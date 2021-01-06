const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Gvc = imports.gi.Gvc;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const St = imports.gi.St;

const KEYBINDING_KEY_NAME = 'keybinding-toggle-mute';

let microphone;

const Microphone = new Lang.Class({
  Name: 'Microphone',

  _init: function() {
    this.active = null;
    this.stream = null;
    this.muted_changed_id = 0;
    this.mixer_control = new Gvc.MixerControl({name: 'Nothing to say'});
    this.mixer_control.open();
    this.mixer_control.connect('default-source-changed', Lang.bind(this, this.refresh));
    this.mixer_control.connect('stream-added', Lang.bind(this, this.refresh));
    this.mixer_control.connect('stream-removed', Lang.bind(this, this.refresh));
    this.refresh();
  },

  refresh: function() {
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
        let output_stream = recording_apps[i];
        let id = output_stream.get_application_id();
        if (!id || (id != 'org.gnome.VolumeControl' && id != 'org.PulseAudio.pavucontrol')) {
          this.active = true;
        }
      }
    }
    this.notify_muted();
    if (this.active != was_active)
        this.emit('notify::active');
  },

  destroy: function() {
      this.mixer_control.close();
  },

  notify_muted: function() {
    this.emit('notify::muted');
  },

  get muted() {
    if (!this.stream)
      return true;
    return this.stream.is_muted;
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


function get_icon_name(muted) {
  if (muted)
    return 'microphone-sensitivity-muted-symbolic';
  else
    return 'microphone-sensitivity-high-symbolic';
}

function icon_should_be_visible(microphone_active) {
  let setting = settings.get_value('icon-visibility').unpack();
  if (setting === 'always')
    return true;
  if (setting === 'never')
    return false;
  return microphone.active;  // when-recording
}


function show_osd(text, muted, level) {
  let monitor = -1;
  Main.osdWindowManager.show(
    monitor,
    Gio.Icon.new_for_string(get_icon_name(muted)),
    text,
    level);
}


let mute_timeout_id = 0;


function on_activate(widget, event) {
  if (microphone.muted) {
    microphone.muted = false;
    show_osd(null, false, microphone.level);
  } else {
    // use a delay before muting; this makes push-to-talk work
    if (mute_timeout_id) {
      Mainloop.source_remove(mute_timeout_id);
      show_osd(  // keep osd visible
        null, false, microphone.level);
    }
    mute_timeout_id = Mainloop.timeout_add(
      100,
      function() {
        mute_timeout_id = 0;
        microphone.muted = true;
        show_osd(null, true, 0);
      });
  }
}


function get_settings() {
  let extension = ExtensionUtils.getCurrentExtension();
  let schema_dir = extension.dir.get_child('schemas');
  let schema_source;
  if (schema_dir.query_exists(null))  // local install
    schema_source = Gio.SettingsSchemaSource.new_from_directory(
      schema_dir.get_path(),
      Gio.SettingsSchemaSource.get_default(),
      false);
  else  // global install (same prefix as gnome-shell)
    schema_source = Gio.SettingsSchemaSource.get_default();
  let schema_id = extension.metadata['settings-schema'];
  let schema = schema_source.lookup(schema_id, true);
  if (!schema)
    throw new Error(
      'Schema ' + schema_id + ' could not be found for extension ' +
      extension.metadata.uuid);
  return new Gio.Settings({settings_schema: schema});
}

const settings = get_settings();

function init() {
}

let panel_button, panel_icon;
let initialised = false;  // flag to avoid notifications on startup

function enable() {
  microphone = new Microphone();
  panel_icon = new St.Icon({
    icon_name: '',
    style_class: 'system-status-icon'});
  panel_button = new St.Bin({
    style_class: 'panel-button',
    reactive: true,
    can_focus: true,
    track_hover: true,
    visible: icon_should_be_visible(microphone.active)
  });
  panel_button.set_child(panel_icon);
  panel_button.connect('button-press-event', on_activate);
  microphone.connect(
    'notify::active',
    function() {
      panel_button.visible = icon_should_be_visible(microphone.active);
      if (initialised || microphone.active)
        show_osd(
          microphone.active ? "Microphone activated" : "Microphone deactivated",
          microphone.muted);
      initialised = true;
    });
  microphone.connect(
    'notify::muted',
    function () {
      panel_icon.icon_name = get_icon_name(microphone.muted);
    });
  Main.panel._rightBox.insert_child_at_index(panel_button, 0);
  Main.wm.addKeybinding(
    KEYBINDING_KEY_NAME,
    settings,
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL,
    on_activate);
}

function disable() {
  Main.wm.removeKeybinding(KEYBINDING_KEY_NAME);
  Main.panel._rightBox.remove_child(panel_button);
  microphone.destroy();
  microphone = null;
  panel_icon.destroy();
  panel_icon = null;
  panel_button.destroy();
  panel_button = null;
}
