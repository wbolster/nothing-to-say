const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const SCHEMA_ROOT = 'org.gnome.shell.extensions.nothing-to-say';

function get_local_gsettings(schema_path) {
  let schemaDir = Extension.dir.get_child('schemas');
  let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
    schemaDir.get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false);
  let schemaObj = schemaSource.lookup(schema_path, true);
  if (!schemaObj)
    throw new Error(
      'Schema ' + schema_path + ' could not be found for extension ' +
      Extension.metadata.uuid);
  return new Gio.Settings({ settings_schema: schemaObj });
}

function Keybindings() {
  var settings = this.settings = get_local_gsettings(SCHEMA_ROOT);
  this.each = function(fn, ctx) {
    var keys = settings.list_children();
    for (let i=0; i < keys.length; i++) {
      let key = keys[i];
      let setting = {
        key: key,
        get: function() { return settings.get_string_array(key); },
        set: function(v) { settings.set_string_array(key, v); }
      };
      fn.call(ctx, setting);
    }
  };
}
