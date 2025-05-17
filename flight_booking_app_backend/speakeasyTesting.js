import * as sp from 'speakeasy';
import { toDataURL } from "qrcode";

// var secret = sp.generateSecret();
// console.log(secret.base32);

// const qr = sp.otpauthURL({secret: secret.ascii, label: "Centric Flights"});

// toDataURL(qr, function (err, data_url) {
//     console.log(data_url);
// });

var secret = sp.generateSecret();
    const emailToken = sp.totp({
        secret: secret.ascii,
        step: 900
    });

    secret = 774192;
const verified = sp.totp.verify({
    secret: "774192",
    token: "774192"
}); 
console.log(verified);