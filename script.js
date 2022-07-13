
var btservice;
var sockchar;
// service: 49535343-fe7d-4ae5-8fa9-9fafd205e455
// characteristic: 49535343-6daa-4d02-abf6-19569aca69fe

async function connect(){
    let printer = await navigator.bluetooth.requestDevice({
        acceptAllDevices:true,
        optionalServices:['49535343-fe7d-4ae5-8fa9-9fafd205e455']
    });
    console.log(printer);
    
    let pserver = await printer.gatt.connect();
    btservice = await pserver.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
    sockchar = await btservice.getCharacteristic('49535343-6daa-4d02-abf6-19569aca69fe');
}

async function selfdiag(){
    let cmdstr = Uint8Array.from([2,27,0,1,0,0,70,137,94,158,3]);
    sockchar.writeValue(cmdstr);
}