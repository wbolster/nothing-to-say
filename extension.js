const Gio = imports.gi.Gio;
const Gvc = imports.gi.Gvc;
const Lang = imports.lang;
const Main = imports.ui.main;
const Signals = imports.signals;
const St = imports.gi.St;



const Microphone = new Lang.Class({
  Name: 'Microphone',

  _init: function() {
    this.active = false;
    this.stream = null;

    this.mixer_control = new Gvc.MixerControl({name: 'Nothing to say'});
    this.mixer_control.open();

    this.mixer_control.connect(
      'default-source-changed',
      Lang.bind(this, this.update));
    this.mixer_control.connect(
      'stream-added',
      Lang.bind(this, this.update));
    this.mixer_control.connect(
      'stream-removed',
      Lang.bind(this, this.update));

    this.update();
  },

  update: function() {
    // based on gnome-shell volume control
    this.stream = this.mixer_control.get_default_source();
    this.active = false;
    if (this.stream) {
      let recording_apps = this.mixer_control.get_source_outputs();
      for (let i = 0; i < recording_apps.length; i++) {
        let outputStream = recording_apps[i];
        let id = outputStream.get_application_id();
        if (!id || (id != 'org.gnome.VolumeControl' && id != 'org.PulseAudio.pavucontrol')) {
          this.active = true;
        }
      }
    }
    this.emit('state-changed');
  },

  get muted() {
    return this.stream && this.stream.is_muted;
  },

  set muted(muted) {
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

function on_activate() {
  let was_muted = microphone.muted;
  microphone.muted = !microphone.muted;
  update_icon(!was_muted);
  let icon_name = was_muted ? 'microphone-sensitivity-high-symbolic' : 'microphone-sensitivity-muted-symbolic';
  let monitor = -1;
  let text = "";
  text += was_muted ? "unmuted" : "muted";
  text += " " + microphone.active;
  Main.osdWindowManager.show(
    monitor,
    Gio.Icon.new_for_string(icon_name),
    text);
}

function show_debug(text) {
  Main.osdWindowManager.show(-1, Gio.Icon.new_for_string(""), text);
}

function microphone_icon(muted) {
  let icon_name = muted ? 'microphone-sensitivity-muted-symbolic' : 'microphone-sensitivity-high-symbolic';
  return Gio.Icon.new_for_string(icon_name);
}

let active = undefined;
function on_state_changed() {
  if (active == undefined) {
    // no osd notifications on startup
    active = microphone.active;
    return;
  }
  if (active == microphone.active) {
    // no change
    return;
  }
  active = microphone.active;
  let monitor = -1;
  let text = active ? "Microphone activated" : "Microphone deactivated";
  Main.osdWindowManager.show(
    monitor, microphone_icon(!active), text);
}

function init() {
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

  microphone.connect('state-changed', on_state_changed);
}

function enable() {
  Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
  Main.panel._rightBox.remove_child(button);
}
