"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gvc = imports.gi.Gvc;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const PanelMenu = imports.ui.panelMenu;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const St = imports.gi.St;

const Extension = ExtensionUtils.getCurrentExtension();

const Gst = try_to_import_or_return_null(() => { return imports.gi.Gst; });
const GstAudio = try_to_import_or_return_null(() => { return imports.gi.GstAudio; });
const isPlayingSoundSupported = Gst != null && GstAudio != null;

const EXCLUDED_APPLICATION_IDS = [
  "org.gnome.VolumeControl",
  "org.PulseAudio.pavucontrol",
];
const KEYBINDING_KEY_NAME = "keybinding-toggle-mute";
const MICROPHONE_ACTIVE_STYLE_CLASS = "screencast-indicator";

let initialised = false; // flag to avoid notifications on startup
let settings = null;
let microphone;
let panel_button;

class Microphone {
  constructor() {
    this.active = null;
    this.stream = null;
    this.muted_changed_id = 0;
    this.mixer_control = new Gvc.MixerControl({ name: "Nothing to say" });
    this.mixer_control.open();
    const refresh_cb = () => {
      this.refresh();
    };
    this.mixer_control.connect("default-source-changed", refresh_cb);
    this.mixer_control.connect("stream-added", refresh_cb);
    this.mixer_control.connect("stream-removed", refresh_cb);
    if (isPlayingSoundSupported) {
      Gst.init(null);
      this.on_sound = init_sound("on");
      this.off_sound = init_sound("off");
    }
    this.refresh();
  }

  refresh() {
    // based on gnome-shell volume control
    if (this.stream && this.muted_changed_id) {
      this.stream.disconnect(this.muted_changed_id);
    }
    let was_active = this.active;
    this.active = false;
    this.stream = this.mixer_control.get_default_source();
    if (this.stream) {
      this.muted_changed_id = this.stream.connect("notify::is-muted", () => {
        this.notify_muted();
      });
      let recording_apps = this.mixer_control.get_source_outputs();
      for (let i = 0; i < recording_apps.length; i++) {
        let output_stream = recording_apps[i];
        let application_id = output_stream.get_application_id();
        if (EXCLUDED_APPLICATION_IDS.includes(application_id)) continue;
        this.active = true;
      }
    }
    this.notify_muted();
    if (this.active != was_active) {
      this.emit("notify::active");
    }
  }

  destroy() {
    this.mixer_control.close();
  }

  notify_muted() {
    this.emit("notify::muted");
  }

  get muted() {
    if (!this.stream) return true;
    return this.stream.is_muted;
  }

  set muted(muted) {
    if (!this.stream) return;
    this.stream.change_is_muted(muted);
  }

  get level() {
    if (!this.stream) return 0;
    return (
      (100 * this.stream.get_volume()) / this.mixer_control.get_vol_max_norm()
    );
  }
}
Signals.addSignalMethods(Microphone.prototype);

const MicrophonePanelButton = GObject.registerClass(
  { GTypeName: "MicrophonePanelButton" },
  class extends PanelMenu.Button {
    _init() {
      super._init(0.0, `${Extension.metadata.name} panel indicator`, false);
      this.icon = new St.Icon({
        icon_name: get_icon_name(false),
        style_class: "system-status-icon",
      });
      this.add_child(this.icon);
      this.connect("button-press-event", () => {
        on_activate({ give_feedback: false });
      });
    }
  }
);

function try_to_import_or_return_null(func_returning_import) {
  try {
    return func_returning_import();
  } catch(e) {
    log(`${Extension.metadata.uuid}: Unable to import sound module. Playing sound is not available. Is GStreamer package installed?`);
    log(`${Extension.metadata.uuid}: ${e}`);
    return null;
  }
}

function init_sound(name) {
  const playbin = Gst.ElementFactory.make("playbin", null);
  const path = Extension.dir.get_child(`sounds/${name}.ogg`).get_path();
  const uri = Gst.filename_to_uri(path);
  playbin.set_property("uri", uri);
  const sink = Gst.ElementFactory.make("pulsesink", "sink");
  playbin.set_property("audio-sink", sink);
  playbin.set_volume(GstAudio.StreamVolumeFormat.LINEAR, 0.5);
  return playbin;
}

function get_icon_name(muted) {
  // TODO: use -low and -medium icons based on .level
  return muted
    ? "microphone-sensitivity-muted-symbolic"
    : "microphone-sensitivity-high-symbolic";
}

function icon_should_be_visible(microphone_active) {
  let setting = settings.get_value("icon-visibility").unpack();
  switch (setting) {
    case "always":
      return true;
    case "never":
      return false;
    default:
      return microphone.active; // when-recording
  }
}

function show_osd(text, muted, level) {
  const monitor = -1;
  const icon = Gio.Icon.new_for_string(get_icon_name(muted));
  Main.osdWindowManager.show(monitor, icon, text, level);
}

let mute_timeout_id = null;

function on_activate({ give_feedback }) {
  if (microphone.muted) {
    microphone.muted = false;
    if (give_feedback) {
      show_osd(null, false, microphone.level);
    }
    if (isPlayingSoundSupported && settings.get_boolean("play-feedback-sounds")) {
      play_sound(microphone.on_sound);
    }
  } else {
    // use a delay before muting; this makes push-to-talk work
    if (mute_timeout_id) {
      GLib.Source.remove(mute_timeout_id);
      if (give_feedback) {
        // keep osd visible
        show_osd(null, false, microphone.level);
      }
    }
    mute_timeout_id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
      mute_timeout_id = null;
      microphone.muted = true;
      if (give_feedback) {
        show_osd(null, true, 0);
      }
      if (isPlayingSoundSupported && settings.get_boolean("play-feedback-sounds")) {
        play_sound(microphone.off_sound);
      }
    });
  }
}

function play_sound(sound) {
  // Rewind in case the sound has played already.
  sound.set_state(Gst.State.NULL);
  sound.set_state(Gst.State.PLAYING);
}

function init() {}

function enable() {
  settings = ExtensionUtils.getSettings();
  microphone = new Microphone();
  panel_button = new MicrophonePanelButton();
  panel_button.visible = icon_should_be_visible(microphone.active);
  const indicatorName = `${Extension.metadata.name} indicator`;
  Main.panel.addToStatusArea(indicatorName, panel_button, 0, "right");
  microphone.connect("notify::active", () => {
    if (microphone.active) {
      panel_button.icon.add_style_class_name(MICROPHONE_ACTIVE_STYLE_CLASS);
    } else {
      panel_button.icon.remove_style_class_name(MICROPHONE_ACTIVE_STYLE_CLASS);
    }
    panel_button.visible = icon_should_be_visible(microphone.active);
    if (settings.get_boolean("show-osd") && (initialised || microphone.active))
      show_osd(
        microphone.active ? "Microphone activated" : "Microphone deactivated",
        microphone.muted
      );
    initialised = true;
  });
  microphone.connect("notify::muted", () => {
    panel_button.icon.icon_name = get_icon_name(microphone.muted);
  });
  Main.wm.addKeybinding(
    KEYBINDING_KEY_NAME,
    settings,
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
    () => {
      on_activate({ give_feedback: settings.get_boolean("show-osd") });
    }
  );
  settings.connect("changed::icon-visibility", () => {
    panel_button.visible = icon_should_be_visible(microphone.active);
  });
}

function disable() {
  Main.wm.removeKeybinding(KEYBINDING_KEY_NAME);
  Main.panel._rightBox.remove_child(panel_button);
  settings = null;
  microphone.destroy();
  microphone = null;
  panel_button.destroy();
  panel_button = null;
  if (mute_timeout_id) {
    GLib.Source.remove(mute_timeout_id);
    mute_timeout_id = null;
  }
}
