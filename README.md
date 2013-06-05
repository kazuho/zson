ZSON
=======================================

ZSON is binary-based JSON. It is similar to BSON or MessagePack; the difference from the two is that ZSON is designed to be streamable while being compact.

ZSON is licensed under the MIT License.

USAGE
-----

Load:

```
var zson = require("zson");
```

Simple encode / decode:

```
var encoded = zson.encode({ hello: "world" });
var decoded = zson.decode(encoded);
```

Streaming encode:

```
function pushCb(octet) {
    ...
}
var encoder = new zson.Encoder(pushCb);
encoder.encodeArray(function () {
    encoder.encode(1);
    encoder.encode(2);
    encoder.encode(3);
    ...
});
encoder.encodeObject(function () {
    encoder.encodeKeyValue("hello", "world");
    ...
});
```

Streaming decode:

```
function getChar() {
    ...
}
var decoder = new zson.Decoder(getChar);
var data = decoder.decode();
```

Custom codec:

```
// dedupe strings in the stream
var dedupingEncoder = function () {
    var stringMap = {};
    return function (v) {
        if (typeof v === "string") {
            if (stringMap.hasOwnProperty(v)) {
                this.push(zson.CUSTOM_TAGS[0]);
                this.encode(stringMap[v]);
                return;
            } else {
                stringMap[v] = Object.keys(stringMap).length;
            }
        }
        return zson.Encoder.prototype.encode.call(this, v);
    };
};

var dedupingDecoder = function () {
    var stringList = [];
    return function () {
        if (this.peek() === zson.CUSTOM_TAGS[0]) {
            return stringList[this.decode()];
        }
        var decoded = zson.Decoder.prototype.decode.call(this);
        if (typeof decoded === "string") {
            stringList.push(decoded);
        }
        return decoded;
    };
};

var encoded = zson.encode(src, { CUSTOM_ENCODER: dedupingEncoder });
var decoded = zson.decode(encoded, { CUSTOM_DECODER: dedupingDecoder });
```

Format
------

<table>
<tr>
<th>Tag</th>
<th>Description</th>
</tr>
<tr><td>0xxxxxxx</td><td>7-bit signed integer (-64 ~ +63)</td></tr>
<tr><td>10xxxxxx [byte]</td><td>14-bit signed integer (-8192 ~ +8191)</td></tr>
<tr><td>110xxxxx [byte] [byte]</td><td>21-bit signed integer (-1048576 ~ 1048575)</td></tr>
<tr><td>1110xxxx [byte] [byte] [byte]</td><td>28-bit signed integer (-134217728 ~ 134217727)</td></tr>
<tr><td>11110000 [byte] [byte] [byte] [byte]</td><td>32-bit signed integer</td></tr>
<tr><td>11110001 [byte] [byte] [byte] [byte]</td><td>IEEE754 float (32-bit)</td></tr>
<tr><td>11110010 8*[byte]</td><td>IEEE754 float (64-bit)</td></tr>
<tr><td>11110011</td><td>null</td></tr>
<tr><td>11110100</td><td>false</td></tr>
<tr><td>11110101</td><td>true</td></tr>
<tr><td>11111100 n*[byte] 11111111</td><td>UTF-8 string</td></tr>
<tr><td>11111101</td><td>start of array</td></tr>
<tr><td>11111110</td><td>start of object (repetition of value-key pairs, keys are raw UTF-8 strings terminated by 0xff)</td></tr>
<tr><td>11111111</td><td>end of the current array or object</td></tr>
</table>

Examples
--------

```
0xfc 0x68 0x65 0x6c 0x6c 0x6f 0xff                      -- "hello"
0xfd 0x01 0x7f 0x81 0x00 0xff                           -- [ 1, -1, 256 ]
0xfe 0xf5 0x63 0x6f 0x6d 0x70 0x61 0x63 0x64 0xff 0xff  -- {"compact":true}
```
