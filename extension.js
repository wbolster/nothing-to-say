"use strict";

import GLib from "gi://GLib";
import Gio from "gi://Gio";
import St from "gi://St";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import Gvc from "gi://Gvc";
import GObject from "gi://GObject";
import Clutter from "gi://Clutter";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

const EXCLUDED_APPLICATION_IDS = [
  "org.gnome.VolumeControl",
  "org.PulseAudio.pavucontrol",
];
const KEYBINDING_KEY_NAME = "keybinding-toggle-mute";
const MICROPHONE_ACTIVE_STYLE_CLASS = "screencast-indicator";

class Microphone extends Signals.EventEmitter {
  constructor() {
    super();
    this.active = null;
    this.stream = null;
    this.mixer_control = new Gvc.MixerControl({ name: "Nothing to say" });
    this.mixer_control.open();
    const refresh_cb = () => {
      this.refresh();
    };
    this.mixer_control.connectObject(
      "default-source-changed",
      refresh_cb,
      "stream-added",
      refresh_cb,
      "stream-removed",
      refresh_cb,
      this,
    );
    this.refresh();
  }

  refresh() {
    // based on gnome-shell volume control
    if (this.stream) {
      this.stream.disconnectObject(this);
    }
    let was_active = this.active;
    this.active = false;
    this.stream = this.mixer_control.get_default_source();
    if (this.stream) {
      this.stream.connectObject(
        "notify::is-muted",
        () => {
          this.notify_muted();
        },
        this,
      );
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
    if (this.stream) {
      this.stream.disconnectObject(this);
      this.stream = null;
    }
    this.mixer_control.disconnectObject(this);
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
    return this.stream.get_volume() / this.mixer_control.get_vol_max_norm();
  }
}

class AudioPlayer {
  #sound_on;
  #sound_off;

  constructor(dir) {
    this.#sound_on = dir.get_child("sounds/on.ogg");
    this.#sound_off = dir.get_child("sounds/off.ogg");
  }

  #play_sound(sound_file) {
    let player = global.display.get_sound_player();
    player.play_from_file(sound_file, "Toggle mute", null);
  }

  play_on() {
    this.#play_sound(this.#sound_on);
  }

  play_off() {
    this.#play_sound(this.#sound_off);
  }
}

const MicrophonePanelButton = GObject.registerClass(
  { GTypeName: "MicrophonePanelButton" },
  class extends PanelMenu.Button {
    _init(extension) {
      super._init(0.0, `${extension.metadata.name} panel indicator`, false);
      this.icon = new St.Icon({
        icon_name: get_icon_name(false),
        style_class: "system-status-icon",
      });
      this.add_child(this.icon);
      this._clickGesture.connectObject(
        "recognize",
        (gesture) => {
          if (gesture.get_button() == Clutter.BUTTON_SECONDARY) {
            // Right click.
            extension.openPreferences();
          } else {
            extension._on_activate({ give_feedback: false });
          }
        },
        this,
      );
    }
  },
);

function get_icon_name(muted) {
  // TODO: use -low and -medium icons based on .level
  return muted
    ? "microphone-sensitivity-muted-symbolic"
    : "microphone-sensitivity-high-symbolic";
}

function show_osd(text, muted, level) {
  Main.osdWindowManager.showAll(
    Gio.Icon.new_for_string(get_icon_name(muted)),
    text,
    level,
  );
}

export default class extends Extension {
  enable() {
    this._initialised = false; // flag to avoid notifications on startup
    this._settings = this.getSettings();
    this._microphone = new Microphone();
    this._audio_player = new AudioPlayer(this.dir);
    this._panel_button = new MicrophonePanelButton(this);
    this._toggle_mute_timeout_id = null;
    this._panel_button.visible = this._icon_should_be_visible();
    const indicatorName = `${this.metadata.name} indicator`;
    Main.panel.addToStatusArea(indicatorName, this._panel_button, 0, "right");
    this._microphone.connectObject(
      "notify::active",
      () => {
        if (this._microphone.active) {
          this._panel_button.icon.add_style_class_name(
            MICROPHONE_ACTIVE_STYLE_CLASS,
          );
        } else {
          this._panel_button.icon.remove_style_class_name(
            MICROPHONE_ACTIVE_STYLE_CLASS,
          );
        }
        this._panel_button.visible = this._icon_should_be_visible();
        if (
          this._settings.get_boolean("show-osd") &&
          (this._initialised || this._microphone.active)
        )
          show_osd(
            this._microphone.active
              ? "Microphone activated"
              : "Microphone deactivated",
            this._microphone.muted,
          );
        this._initialised = true;
      },
      "notify::muted",
      () => {
        this._panel_button.icon.icon_name = get_icon_name(
          this._microphone.muted,
        );
      },
      this,
    );
    this._addKeybinding();
    this._settings.connectObject(
      "changed::keybinding-mode",
      () => {
        Main.wm.removeKeybinding(KEYBINDING_KEY_NAME);
        this._addKeybinding();
      },
      "changed::icon-visibility",
      () => {
        this._panel_button.visible = this._icon_should_be_visible();
      },
      this,
    );
  }

  _icon_should_be_visible() {
    let setting = this._settings.get_value("icon-visibility").unpack();
    switch (setting) {
      case "always":
        return true;
      case "never":
        return false;
      default:
        return this._microphone.active; // when-recording
    }
  }

  _on_activate({ give_feedback }) {
    this._toggle_mute(!this._microphone.muted, give_feedback);
  }

  _toggle_mute(mute, give_feedback) {
    // use a delay before toggling; this makes push-to-talk/mute work
    if (this._toggle_mute_timeout_id) {
      GLib.Source.remove(this._toggle_mute_timeout_id);
      if (give_feedback) {
        // keep osd visible
        show_osd(null, !mute, mute ? this._microphone.level : 0);
      }
    }
    this._toggle_mute_timeout_id = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      100,
      () => {
        this._toggle_mute_timeout_id = null;
        this._set_mute(mute, give_feedback);
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  _set_mute(mute, give_feedback) {
    this._microphone.muted = mute;
    this._show_mute_feedback(mute, give_feedback);
  }

  _show_mute_feedback(mute, give_feedback) {
    if (give_feedback) {
      show_osd(null, mute, mute ? 0 : this._microphone.level);
    }
    if (this._settings.get_boolean("play-feedback-sounds")) {
      if (mute) {
        this._audio_player.play_off();
      } else {
        this._audio_player.play_on();
      }
    }
  }

  _addKeybinding() {
    const mode = this._settings.get_string("keybinding-mode");
    const give_feedback = () => this._settings.get_boolean("show-osd");
    const action_mode = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;
    let flags;
    let handler;

    if (mode === "push-to-talk" || mode === "push-to-mute") {
      flags =
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT |
        Meta.KeyBindingFlags.TRIGGER_RELEASE;
      handler = (_display, _window, event) => {
        const press = event.type() === Clutter.EventType.KEY_PRESS;
        if (mode === "push-to-talk") {
          this._set_mute(!press, give_feedback());
        } else {
          this._set_mute(press, give_feedback());
        }
      };
    } else {
      flags =
        mode === "toggle"
          ? Meta.KeyBindingFlags.IGNORE_AUTOREPEAT
          : Meta.KeyBindingFlags.NONE;
      handler = () => {
        if (mode === "toggle") {
          this._set_mute(!this._microphone.muted, give_feedback());
        } else {
          this._on_activate({ give_feedback: give_feedback() });
        }
      };
    }
    Main.wm.addKeybinding(
      KEYBINDING_KEY_NAME,
      this._settings,
      flags,
      action_mode,
      handler,
    );
  }

  disable() {
    this._microphone.disconnectObject(this);
    this._settings.disconnectObject(this);
    Main.wm.removeKeybinding(KEYBINDING_KEY_NAME);
    Main.panel._rightBox.remove_child(this._panel_button);
    if (this._toggle_mute_timeout_id) {
      GLib.Source.remove(this._toggle_mute_timeout_id);
      this._toggle_mute_timeout_id = null;
    }
    this._microphone.destroy();
    this._microphone = null;
    this._panel_button.destroy();
    this._panel_button = null;
    this._audio_player = null;
    this._settings = null;
  }
}
