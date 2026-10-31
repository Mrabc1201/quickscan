#!/bin/bash
adb install -r real.apk > smoke_install.txt 2>&1
adb logcat -c
adb shell monkey -p com.quickscan.quickscan -c android.intent.category.LAUNCHER 1 > smoke_launch.txt 2>&1
sleep 30
adb logcat -d -t 2500 > smoke_logcat_full.txt 2>&1
adb shell pidof com.quickscan.quickscan > smoke_pid.txt 2>&1
adb exec-out screencap -p > smoke_screen.png 2>/dev/null
exit 0
