# WebBLE with Paperang 

Prints redered markdown. Paper not padded after print finishes. Manual pull is required at the moment to get the full print area. 



## Some useful BLE related constants:

- Service ID: `49535343-fe7d-4ae5-8fa9-9fafd205e455`
- Characteristic value to write to: `49535343-6daa-4d02-abf6-19569aca69fe`
- Characteristic value to receive from the printer: `49535343-1e4d-4bd9-ba61-23c647249616` This is a NOTIFY character.



## Some other tips on printing

- BLE has a max data packet of 512, means 502 bytes of useful data. However, I found out that each packet should not contain unfinished lines otherwise they tear. So I rounded to 480 for 48 bytes per line on P1.

## Other than just printing

All send and receive data command byte are in `const.txt`. Send and receive has (almost) same data structure. When a packet is received, its also begin with 0x02 and end with 0x03. 

2nd byte is command byte, then the first 5 and last 5 bytes are not very useful since I don't care about checksums so I discarded them. Then the last 11 bytes of whats remaining seems to be some kind of redundant addon data, so they are disregarded as well. Then only a handful of bytes will remain and they are easier to decode. 

- Reading ASCII stringed values (SN, model, board version...) : Just do the right truncating and decode the rest as ASCII.
- Battery status: Send command 16, only one byte will remain after all the truncating. That byte is the percentage value directly usable. Do not divide it again by 255.
- Get heat density: Send 28, then look at the first byte returned. Same as battery status. Do not divide by 255.
- Feed line: The printer will feed blank paper of a specific length. Send command 26, then immediately followed by the amount of lines(in pixel) to be fed encoded as payload data. 

- Power-down time: Send 31, get a 2 byte integer. Notice it's little endian means reverse their byte order to read them. i.e. `[16,14]` or `0x100E` indicate 3600 seconds, not 4110.

> Some commands in the list are not implemented on the P1 model. I do not know whether it works on any other model. 