# Running the console on a Mac

Two launchers. Both start the same local server and open
<http://localhost:3100/app>; neither copies the code, so pulling the repo keeps
them current.

## The Terminal launcher — works immediately

Double-click **`mac/LazyScale Console.command`** in Finder.

A Terminal window opens, the server starts, and the browser opens the console on
its own. Closing the window, or Ctrl-C, stops the server.

This is the one to use. Terminal already has whatever folder permissions you
have granted it, so macOS does not need persuading.

## The app bundle — nicer, one hurdle

```bash
./mac/make-app.sh          # builds ~/Applications/LazyScale Console.app
DEST=/Applications ./mac/make-app.sh   # for every user on the Mac
```

It gets the LazyScale icon, hides itself from the Dock once the browser is open,
and reuses a server that is already running rather than starting a second one.

**The hurdle:** macOS gates an app's access to Downloads, Documents and Desktop,
and an unsigned bundle is refused rather than prompted. With the project in
`~/Downloads` the launcher gets `Operation not permitted` and shows an alert
saying so. Two ways past it:

- **System Settings → Privacy & Security → Files and Folders → LazyScale
  Console**, and switch on the folder the project is in; or
- **move the project out of `~/Downloads`** — `~/Projects/lazyscale` or similar.
  Then there is nothing to grant, and the folder stops being one macOS tidies up.

The app writes to `~/Library/Logs/LazyScale-Console.log`.

## What it needs

Node 18+, Git, and the Vercel CLI — see the install section in the root README.
The app bundle looks for `node` and `vercel` in Homebrew's paths and in nvm,
because a GUI app inherits almost none of your shell's `PATH`.

## Rebuilding

`make-app.sh` writes the launcher fresh each time, so run it again after changing
the script — and after moving the project, since the path is baked in at build
time.
