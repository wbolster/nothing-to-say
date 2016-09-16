const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;


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

function show_hello() {
  let stream = get_stream();
  if (!stream)
    return;
  let muting = !stream.is_muted;
  stream.change_is_muted(muting);
  update_icon(muting);
  let text = muting ? "Microphone muted" : "Microphone unmuted";
  let icon_name = muting ? 'microphone-sensitivity-muted-symbolic' : 'microphone-sensitivity-high-symbolic';
  let monitor = -1;
  Main.osdWindowManager.show(
    monitor,
    Gio.Icon.new_for_string(icon_name),
    text);
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
  button.connect('button-press-event', show_hello);
}

function enable() {
  Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
  Main.panel._rightBox.remove_child(button);
}
