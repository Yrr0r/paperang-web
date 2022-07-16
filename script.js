
var btservice;
var sockchar;
var notify;

// some global variables:
var widthbyte = 48; // p1 has 48 bytes per line. make this one variable in future.
var binarizationInterval = 420; // Between 0 and 768.

// editor settings
var simplemde = new SimpleMDE({
    element: document.getElementById("editorarea"),
    spellChecker: false,
    previewRender: (text) => {
        let d = marked.parse(text);
        return `<div class="content"> ${d} </div>`
    }
});


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
            let a = new DataView(value)
            // Convert raw data bytes to hex values just for the sake of showing something.
            // In the "real" world, you'd use data.getUint8, data.getUint16 or even
            // TextDecoder to process raw data bytes.
            console.log('Notify:' , a);
        })
    })
}

async function selfdiag() {
    await sockchar.writeValue(genpack(27));
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
    let maxbyte = (Math.floor(500/widthbyte)) * widthbyte;
    let packs = aslice(data, maxbyte);
    console.log(packs)
    for (each in packs) {
        let m = await sockchar.writeValue(genpack(0, packs[each]));
        console.log(m)
    }
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
async function textRender(elementid){
    let out = document.getElementById(elementid);
    out.innerHTML = marked.parse(simplemde.value());
    await bitmapRender(elementid);
    out.innerHTML = '';
    /*
    let node = document.createElement('div');
    node.innerHTML = marked.parse(simplemde.value());
    await bitmapRender(node);*/
}
async function bitmapRender(elementid){
    let node = document.getElementById(elementid);
    // canvas renderer: bindata is the bytearray.
    let bindata; // this is goint to be the binary bytearray.
    // in future swapping to another renderer is just rewrite this part.
    // width is always (widthbyte * 8) bytes.
    let canvas = await html2canvas(node, {
        width: widthbyte * 4,
        windowWidth: widthbyte * 4,
        onclone: (cloned) => {
            cloned.getElementById(elementid).style.display = 'block'
        }
    });
    console.log(canvas);
    bindata = canvas.getContext('2d').getImageData(0,0,canvas.width, canvas.height).data;
    //document.body.appendChild(canvas);
    

    // canvas render done, rest is good.
    
    console.log(bindata);
    // Get image binarized
    let binarized = new Array();
    for(let i=0; i<bindata.length;i+=4){
        let curr = bindata[i] + bindata[i+1] + bindata[i+2];
        if(curr < binarizationInterval){
            curr = 0;
        } else {
            curr = 1;
        }
        binarized.push(curr);
    }
    console.log(binarized);
    // Encode to bit by bit
    let encoded = new Array();
    for (let i=0; i<binarized.length; i+=8){
        let t = 0;
        for(let j=0; j<8; j++){
            let n = binarized[i+j];
            if(n == 1){ // now 1 is white 0 is black
                t = t * 2;
            } else {
                t = t * 2 + 1;
            }
        }
        encoded.push(t)
    }
    console.log(encoded);

    // send to print
    sendprint(encoded);
}