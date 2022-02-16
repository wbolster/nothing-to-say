"use strict";

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const GTK_VERSION = Gtk.get_major_version();

var KeybindingsWidget = new GObject.Class({
  Name: `KeybindingsWidget`,
  Extends: Gtk.Box,

  _init: function (settingKeys, settings) {
    this._settingKeys = settingKeys;
    this._settings = settings;

    this.parent();
    this.set_orientation(Gtk.Orientation.VERTICAL);
    this._columns = {
      NAME: 0,
      ACCEL_NAME: 1,
      MODS: 2,
      KEY: 3,
    };

    this._store = new Gtk.ListStore();
    this._store.set_column_types([
      GObject.TYPE_STRING,
      GObject.TYPE_STRING,
      GObject.TYPE_INT,
      GObject.TYPE_INT,
    ]);

    this._tree_view = new Gtk.TreeView({
      model: this._store,
      hexpand: false,
      vexpand: false,
    });

    let action_renderer = new Gtk.CellRendererText();
    let action_column = new Gtk.TreeViewColumn({
      title: "",
      expand: true,
    });
    action_column.pack_start(action_renderer, true);
    action_column.add_attribute(action_renderer, "text", 1);
    this._tree_view.append_column(action_column);

    let keybinding_renderer = new Gtk.CellRendererAccel({
      editable: true,
      accel_mode: Gtk.CellRendererAccelMode.GTK,
      xalign: 1,
    });
    keybinding_renderer.connect("accel-edited", (renderer, iter, key, mods) => {
      let value = Gtk.accelerator_name(key, mods);
      let [success, iterator] = this._store.get_iter_from_string(iter);

      if (!success) {
        printerr("Can't change keybinding");
      }

      let name = this._store.get_value(iterator, 0);

      this._store.set(
        iterator,
        [this._columns.MODS, this._columns.KEY],
        [mods, key]
      );
      this._settings.set_strv(name, [value]);
    });

    let keybinding_column = new Gtk.TreeViewColumn({
      title: "",
    });
    keybinding_column.pack_end(keybinding_renderer, false);
    keybinding_column.add_attribute(
      keybinding_renderer,
      "accel-mods",
      this._columns.MODS
    );
    keybinding_column.add_attribute(
      keybinding_renderer,
      "accel-key",
      this._columns.KEY
    );
    this._tree_view.append_column(keybinding_column);
    this._tree_view.columns_autosize();
    this._tree_view.set_headers_visible(false);

    if (GTK_VERSION == 3) {
      this.add(this._tree_view);
    } else {
      this.append(this._tree_view);
    }
    this.keybinding_column = keybinding_column;

    this._settings.connect("changed", this._onSettingsChanged.bind(this));
    this._refresh();
  },

  // Support the case where all the settings has been reset.
  _onSettingsChanged: function () {
    if (this._refreshTimeout) GLib.source_remove(this._refreshTimeout);

    this._refreshTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._refreshTimeout = 0;
      this._refresh();
    });
  },

  _refresh: function () {
    this._store.clear();

    this._settingKeys.forEach((settingKey) => {
      let [key, mods] = Gtk.accelerator_parse(
        this._settings.get_strv(settingKey)[0] || ""
      );

      let iter = this._store.append();
      this._store.set(
        iter,
        [
          this._columns.NAME,
          this._columns.ACCEL_NAME,
          this._columns.MODS,
          this._columns.KEY,
        ],
        [
          settingKey,
          this._settings.settings_schema.get_key(settingKey).get_summary(),
          mods,
          key,
        ]
      );
    });
  },
});
