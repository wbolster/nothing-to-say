==============
nothing to say
==============

this gnome-shell extension always keeps your microphone muted, unless
you actually have something to say.

tl;dr:

* microphone icon in the top bar, only visible when recording is active
* one-click mute/unmute using the icon
* keyboard shortcut to mute/unmute, with push-to-talk
* osd and sound notifications for microphone events
* install from https://extensions.gnome.org/extension/1113/nothing-to-say/

like it? you can `buy me a coffee <https://www.buymeacoffee.com/wbolster>`_! ☕🙏


pics?
=====

this is how it looks in the top bar:

.. image:: /screenshot-top-bar.png?raw=true
   :alt: top bar screenshot
   :align: center

this is the osd (on screen display) notification:

.. image:: /screenshot-osd.png?raw=true
   :alt: osd screenshot
   :align: center


for whom?
=========

this extension is intended for gnome users who participate in
teleconferences.

it is especially awesome if you are in a noisy environment. you know,
those coffee bars where the hipster crowd sits with their laptops.
sipping from a way too expensive soy latte macchiato. which is served
with a complimentary slice of gluten-free cake. which happens to be
smaller than your finger nail. and it does not even taste sweet.
anyway, i digress.

is this you? great. read on.

not you? well, maybe you are in a less exciting, but perhaps more
common, open-plan office.

is this you? totally cool. read on.


what?
=====

this extension offers these amazing features:

* microphone icon in the top bar

  the icon shows whether the mic is muted or not. click it to toggle.
  the icon is only visible when the microphone is actually being
  recorded. that means no visual clutter if the microphone is not in
  use.

* shortcut key to mute or unmute

  press the shortcut key once to unmute, and once again to mute.

  but there is more. the shortcut key also functions as a
  walkie-talkie style push-to-talk button. how cool is that?

  you do not know what that is? no worries, it is rather simple. press
  the configured shortcut key to unmute the microphone, and keep it
  pressed. whenever you release the shortcut key, the microphone will
  be muted again. so as long as you press the key you can talk, and as
  soon as you release it, you can cough and sneeze as much as you
  like.

  the default shortcut is ``<Super>backslash``. you don’t like it?
  funny, neither do i. but at least it does not clash with anything
  else, so please do not complain about it. why not? well, because you
  can change it in the preference pane!

  you can even add additional shortcuts. this involves setting the
  appropriate dconf key. the easiest way is typing this into a
  terminal window::

    dconf write /org/gnome/shell/extensions/nothing-to-say/keybinding-toggle-mute '["<Super>backslash", "Pause"]'

  of course you should change the preferred shortcuts into something
  that makes sense for you and your keyboard.

* on screen display (osd) pop-up notifications

  an osd pop-up, which is the small overlay window that also pops up
  when you change your speaker volume or laptop screen brightness,
  will be shown for the following events:

  * microphone (de)activation

    this happens when a video conferencing application starts or stops
    recording.

  * microphone muting and unmuting

    this happens when you mute the microphone by clicking on the icon
    or pressing the shortcut key.


how?
====

this extension is available via the official `gnome-shell extensions
repository <https://extensions.gnome.org/>`_:

https://extensions.gnome.org/extension/1113/nothing-to-say/

alternatively, if you‘re feeling adventurous or want to contribute,
put a clone of this repository (or a symlink) in this directory::

  ~/.local/share/gnome-shell/extensions/nothing-to-say@extensions.gnome.wouter.bolsterl.ee/

note that the files must be directly in this directory, not in a
subdirectory thereof.


why?
====

when participating in a group call, it is very likely that you are not
speaking most of the time, unless you are the main speaker in a remote
presentation. so why stream all your background noise to the rest of
the attendees?

think for a bit. oh yes. you have heard ringing phones, crying babies,
coughs, sneezes, or, if you have been particularly unlucky, even less
appetising sounds. at some point people get annoyed. someone will
speak up to ask others to please be quiet. the original conversation
got interrupted. the attendees got distracted. what were we talking
about again? what was this meeting supposed to be about in the first
place?

oops, i digress. again.

luckily most teleconferencing applications allow you to mute yourself.
however, that usually involves clicking a button in that application‘s
window. and that application may not be visible. because you were just
getting some real work done. right?

nah. more likely, you were looking at cat pictures. oh boy, this one
is seriously cute. oh wow. this one is even cuter.

at this point someone in the meeting suddenly asks you a question.

focus. think. act. you have to quickly find the correct window.
dammit, where has that browser tab gone? ah, found it. unmute
yourself. speak for a bit. now mute yourself again.

so many things to do when you just want to speak a few wise words.
‘correct, boss, as usual you are completely right!’

now. that was stressful.

situations like that need fixing. that’s why.


who wrote this?
===============

wouter bolsterlee. wbolster.

https://github.com/wbolster on github. star my repos. fork them. and so on.

https://twitter.com/wbolster on twitter. follow me. or say hi.


license
=======

© 2016–2021 wouter bolsterlee

licensed under gpl v2. see license file for details. contains code snippets originating from gnome-shell itself, which is also gpl v2.

sounds from Kenney's Interface Sounds, CC0:
https://www.kenney.nl/assets/interface-sounds

anything else?
==============

oh yes. this is alpha quality experimental software. feedback welcome
via the issue tracker, both praise and complaints. although preferably
the former.
