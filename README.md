# nokia-800-tough
Nokia 800 Tough Kai 2.5.2.2 Hacking

### Debug Mode (ADB)

```
*#*#33284#*#*
```

### Rooting

#### Download EDL loader

```
wget https://edl.bananahackers.net/loaders/800t.mbn
```

#### Clone EDL repo

```
git clone https://github.com/andybalholm/edl.git
```

#### Clone 8k-boot-patcher repo

```
git clone https://gitlab.com/suborg/8k-boot-patcher.git
```

#### Disable udev rules on the device you connect to via USB

```
cd edl
sudo cp 51-edl.rules /etc/udev/rules.d/
sudo cp 50-android.rules /etc/udev/rules.d/
echo "blacklist qcserial" | sudo tee /etc/modprobe.d/blacklist-qcserial.conf
sudo udevadm control --reload-rules
```

#### Connect phone via USB and check connection

```
adb devices
```

### Reboot into EDL mode

```
adb reboot edl
```

To exit EDL mode, press the left button and the power button at the same time.

### Check EDL connection

```
python3 edl.py -loader 800t.mbn -printgpt
```

#### Dump current boot image

```
adb reboot edl
python3 edl.py -loader 800t.mbn -r boot boot.img
```

Backup boot.img

#### Patch boot.img

```
cd 8k-boot-patcher
docker build -t 8kbootpatcher .
cd ../edl
docker run --rm -it -v $(pwd):/image 8kbootpatcher
```

#### Flash patched boot.img

```
adb reboot edl
python3 edl.py -loader 800t.mbn -w boot boot.img
```

Reboot the phone by pressing left button and power button.


#### Check if you root now

```
adb shell
root@Nokia 800 Tough:/ #
```

### Install custom apps

```
git clone https://gitlab.com/suborg/gdeploy.git
cd gdeploy/
npm i
sudo npm link
```
