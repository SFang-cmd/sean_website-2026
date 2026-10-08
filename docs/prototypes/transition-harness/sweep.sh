#!/bin/zsh
B="http://127.0.0.1:3104/index.html"
S=/private/tmp/claude-501/-Users-sean-limen/c25e5567-377d-41f5-8d49-960f0c169d44/scratchpad/spike/shots; mkdir -p $S
run_set() { # $1 app, $2 tag, $3 extra params
  for mode in canvas svgmask clippath vt-clippath vt-plain; do
    open -a "$1" "$B?mode=$mode&auto=1&tag=$2&$3"; sleep 5
  done
}
shoot() { # $1 app, $2 tag, $3 mode, $4 extra
  open -a "$1" "$B?mode=$3&auto=1&slow=30&tag=$2&$4"; sleep 6
  if [[ "$1" == "Safari" ]]; then id=$(osascript -e 'tell application "Safari" to id of window 1'); else id=$(osascript -e 'tell application "Google Chrome" to id of window 1'); fi
  screencapture -x -l $id "$S/$2-$3.png" 2>&1
}
for app in "Google Chrome" "Safari"; do
  open -a "$app" "$B?tag=warm"; sleep 3
  if [[ "$app" == "Safari" ]]; then osascript -e 'tell application "Safari" to set bounds of front window to {0, 0, 1440, 990}'; else osascript -e 'tell application "Google Chrome" to set bounds of front window to {0, 0, 1440, 990}'; fi
  sleep 1
  short=${app// /}
  run_set "$app" "$short-1440" ""
  run_set "$app" "$short-1440-proxy2560" "cell=14"
  for mode in vt-plain vt-clippath clippath svgmask; do shoot "$app" "$short" $mode ""; done
done
echo SWEEP-DONE
