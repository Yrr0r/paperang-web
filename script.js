
var btservice;
var sockchar;
var notify;
/*
Some useful facts about printers:
    service: 49535343-fe7d-4ae5-8fa9-9fafd205e455
characteristics values are
    Write to:  49535343-6daa-4d02-abf6-19569aca69fe
    notify: 49535343-1e4d-4bd9-ba61-23c647249616
On BLE, max size of one pack is 512, means 502 for each data pack.
*/
async function connect() {
    // Call browser popup to let user select device
    let printer = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['49535343-fe7d-4ae5-8fa9-9fafd205e455']
    });
    console.log(printer);

    let pserver = await printer.gatt.connect(); // BLE connect
    btservice = await pserver.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
    sockchar = await btservice.getCharacteristic('49535343-6daa-4d02-abf6-19569aca69fe');
    notify = await btservice.getCharacteristic('49535343-1e4d-4bd9-ba61-23c647249616');
    notify.startNotifications().then(() => {
        notify.addEventListener('characteristicvaluechanged', (event) => {
            let value = event.target.value;
            let a = [];
            // Convert raw data bytes to hex values just for the sake of showing something.
            // In the "real" world, you'd use data.getUint8, data.getUint16 or even
            // TextDecoder to process raw data bytes.
            for (let i = 0; i < value.byteLength; i++) {
                a.push(('00' + value.getUint8(i).toString(16)).slice(-2));
            }
            console.log('Notify:' , a.join(' '));
        })
    })
}

async function selfdiag() {
    let cmdstr = Uint8Array.from([2, 27, 0, 1, 0, 0, 70, 137, 94, 158, 3]);
    await sockchar.writeValue(cmdstr);
}

async function sendprint(data) {
    if (data.length < 500) {
        await sockchar.writeValue(genpack(0, data));
        return;
    }
    function aslice(arr, size) {
        let ret = [];
        for (let i = 0; i < arr.length; i += size) {
            let piece = arr.slice(i, i + size);
            ret.push(piece);
        }
        return ret;
    }
    let packs = aslice(data, 500);
    console.log(packs)
    for (each in packs) {
        let m = await sockchar.writeValue(genpack(0, packs[each]));
        console.log(m)
    }
}


function randfill(n) {
    let arr = Array(n);
    for (let i = 0; i < n; i += 40) {
        for (let j = 0; j < 40; j++) {
            if (j % 2) {
                arr[i + j] = 255;
            } else {
                arr[i + j] = 0;
            }

        }
    }
    return arr;
}


// --- JSDoc Enabled funcs

/**
 * 
 * @param {int} cmd Command Byte (1 byte)
 * @param {array} data Data Array (Max 2016 bytes)
 * @param {int} packetid Packet id (1 byte)
 */
function genpack(cmd, data = [0], packetid = 0) {
    function b32split(i) {
        // js sucks to be a low level byte manipulator.
        let r = new ArrayBuffer(4);
        let v = new DataView(r);
        v.setUint32(0, i, true);
        let t8 = new Uint8Array(r);
        let arr = [...t8];
        return arr;
    }
    let length = data.length;
    if (length > 2016) { console.error("genpack: Requested pack too large"); return null; };
    let bytes = Array();
    bytes.push(2); //First byte 0x02
    bytes.push(cmd); // 2nd byte is command
    bytes.push(packetid); // 3rd byte is packet id

    // Spliting the length byte
    let lengthByte = b32split(length);
    bytes.push(lengthByte[0], lengthByte[1]); // 4th and 5th byte is length

    // append payload, starts from 6th byte.
    bytes = bytes.concat(data);

    // calculate CRC32.
    let crcval = CRC32.buf(data, 0x35769521);
    bytes = bytes.concat(b32split(crcval)); // append that 4 bytes.

    bytes.push(3); // last ending byte

    let bytestream = Uint8Array.from(bytes)
    return bytestream;
}

/*
* Graphical rendering
*/

function bitmapRender(){
    let node = document.getElementById("inputtext");
    domtoimage.toPng(node, {width: 340}).then(function(dataUrl){
        var img = new Image();
        img.src = dataUrl;
        document.body.appendChild(img);
    })
}