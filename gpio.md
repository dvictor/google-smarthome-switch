I'm using a cheap board from Electrodragon to attach a GPIO interface to my PC

The board is based on CH341

https://www.electrodragon.com/product/ch341-usb-convert-flash-board-usb-ttl-iic-spi-etc/

There's a Linux kernel module for it: 

```bash
git clone git@github.com:gschorcht/i2c-ch341-usb.git
git clone https://github.com/gschorcht/i2c-ch341-usb.git
cd i2c-ch341-usb
make

sudo make install
```

I created this udev rules to get write access from my normal user
```
cat /etc/udev/rules.d/ch341-local.rules

ACTION=="add", \
 ATTRS{idVendor}=="1a86", \
 ATTRS{idProduct}=="5512", \
 RUN+="/bin/sh -c 'chown victor: /sys/class/gpio/gpio*/value'"
```

After creating the file, reload rules instead of restarting the computer
```bash
udevadm control --reload-rules
```
