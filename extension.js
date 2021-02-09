"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Gvc = imports.gi.Gvc;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const PanelMenu = imports.ui.panelMenu;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const St = imports.gi.St;

const Extension = ExtensionUtils.getCurrentExtension();

const EXCLUDED_APPLICATION_IDS = [
  "org.gnome.VolumeControl",
  "org.PulseAudio.pavucontrol",
];
const KEYBINDING_KEY_NAME = "keybinding-toggle-mute";
const MICROPHONE_ACTIVE_STYLE_CLASS = "screencast-indicator";

let initialised = false; // flag to avoid notifications on startup
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

let mute_timeout_id = 0;

function on_activate({ give_feedback }) {
  if (microphone.muted) {
    microphone.muted = false;
    if (give_feedback) {
      show_osd(null, false, microphone.level);
    }
  } else {
    // use a delay before muting; this makes push-to-talk work
    if (mute_timeout_id) {
      Mainloop.source_remove(mute_timeout_id);
      // keep osd visible
      show_osd(null, false, microphone.level);
    }
    mute_timeout_id = Mainloop.timeout_add(100, () => {
      mute_timeout_id = 0;
      microphone.muted = true;
      if (give_feedback) {
        show_osd(null, true, 0);
      }
    });
  }
}

function get_settings() {
  const schema_source = Gio.SettingsSchemaSource.new_from_directory(
    Extension.dir.get_child("schemas").get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );
  const schema_id = Extension.metadata["settings-schema"];
  const schema = schema_source.lookup(schema_id, true);
  if (!schema)
    throw new Error(
      `Schema ${schema_id} could not be found for extension ${Extension.metadata.uuid}`
    );
  return new Gio.Settings({ settings_schema: schema });
}

const settings = get_settings();

function init() {}

function enable() {
  microphone = new Microphone();
  panel_button = new MicrophonePanelButton();
  panel_button.visible = icon_should_be_visible(microphone.active);
  Main.panel.addToStatusArea(
    `${Extension.metadata.name} indicator`,
    panel_button,
    0,
    "right"
  );
  microphone.connect("notify::active", () => {
    if (microphone.active) {
      panel_button.icon.add_style_class_name(MICROPHONE_ACTIVE_STYLE_CLASS);
    } else {
      panel_button.icon.remove_style_class_name(MICROPHONE_ACTIVE_STYLE_CLASS);
    }
    panel_button.visible = icon_should_be_visible(microphone.active);
    if (initialised || microphone.active)
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
    Shell.ActionMode.NORMAL,
    () => {
      on_activate({ give_feedback: true });
    }
  );
  settings.connect("changed::icon-visibility", () => {
    panel_button.visible = icon_should_be_visible(microphone.active);
  });
}

function disable() {
  Main.wm.removeKeybinding(KEYBINDING_KEY_NAME);
  Main.panel._rightBox.remove_child(panel_button);
  microphone.destroy();
  microphone = null;
  panel_button.destroy();
  panel_button = null;
}
