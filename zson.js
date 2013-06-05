/*
 * Copyright (c) 2013 DeNA Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

function Encoder(pushCb) {
	this.push = pushCb;
	this.encodeFloat = this.encodeFloat64; // by default
}

Encoder.encode = function (src) {
	var output = [];
	new Encoder(function (octet) { output.push(octet); }).encode(src);
	var typedOutput = new Uint8Array(output.length);
	for (var i = 0; i != output.length; ++i) {
		typedOutput[i] = output[i];
	}
	return typedOutput;
};

Encoder.prototype.encode = function encode(src) {
	switch (typeof src) {
	case "number":
		if ((src | 0) === src) {
			this.encodeInt(src);
		} else {
			this.encodeFloat(src);
		}
		break;
	case "string":
		this.encodeString(src);
		break;
	case "object":
		if (src === null) {
			this.encodeNull();
		} else if (src instanceof Array) {
			this.encodeArray(src);
		} else {
			this.encodeObject(src);
		}
		break;
	case "boolean":
		this.encodeBoolean(src);
		break;
	case "null":
	case "undefined":
		this.encodeNull();
		break;
	default:
		throw new Error("cannot encode value of type:" + typeof src);
	}
};

Encoder.prototype.encodeInt = function encodeInt(src) {
	var srcAbs = src >= 0 ? src : -src - 1;
	if (srcAbs < 64 /* 2^6 */) {
		this.push(src & 0x7f);
	} else if (srcAbs < 8192 /* 2^13 */) {
		this.push(0x80 | ((src >> 8) & 0x3f));
		this.push(src & 0xff);
	} else if (srcAbs < 1048576 /* 2^20 */) {
		this.push(0xc0 | ((src >> 16) & 0x1f));
		this.push((src >> 8) & 0xff);
		this.push(src & 0xff);
	} else if (srcAbs < 134217728 /* 2^27 */) {
		this.push(0xe0 | ((src >> 24) & 0xf));
		this.push((src >> 16) & 0xff);
		this.push((src >> 8) & 0xff);
		this.push(src & 0xff);
	} else {
		this.push(0xf0);
		this.push((src >> 24) & 0xff);
		this.push((src >> 16) & 0xff);
		this.push((src >> 8) & 0xff);
		this.push(src & 0xff);
	}
};

Encoder.prototype.encodeFloat64 = function () {
	var view = new DataView(new ArrayBuffer(8));
	return function encodeFloat64(src) {
		this.push(0xf2);
		view.setFloat64(0, src);
		for (var i = 0; i != 8; ++i) {
			this.push(view.getUint8(i));
		}
	};
}();

Encoder.prototype.encodeNull = function encodeNull() {
	this.push(0xf3);
};

Encoder.prototype.encodeBoolean = function encodeBoolean(src) {
	this.push(src ? 0xf5 : 0xf4);
};

Encoder.prototype.encodeArray = function encodeArray(src) {
	this.push(0xfd);
	if (typeof src === "function") {
		src(); // callback style
	} else {
		for (var i = 0; i != src.length; ++i) {
			this.encode(src[i]);
		}
	}
	this.push(0xff);
};

Encoder.prototype.encodeObject = function encodeObject(src) {
	this.push(0xfe);
	if (typeof src === "function") {
		src(); // callback style
	} else {
		for (var k in src) {
			if (src.hasOwnProperty(k)) {
				this.encodeKeyValue(k, src[k]);
			}
		}
	}
	this.push(0xff);
};

Encoder.prototype.encodeKeyValue = function encodeKey(key, value) {
	this.encode(value);
	this.appendString(key);
	this.push(0xff);
};

Encoder.prototype.encodeString = function encodeString(src) {
	this.push(0xfc);
	if (typeof src === "function") {
		src();
	} else {
		this.appendString(src);
	}
	this.push(0xff);
};

Encoder.prototype.appendString = function appendString(src) {
	for (var i = 0; i != src.length; ++i) {
		var code = src.charCodeAt(i);
		if (code < 0x80) {
			this.push(code);
		} else if (code < 0x800) {
			this.push(0xc0 | (code >> 6) & 0x1f);
			this.push(0x80 | (code & 0x3f));
		} else {
			// FIXME handle surrogate pair
			this.push(0xe0 | ((code >> 12) & 0xf));
			this.push(0x80 | ((code >> 6) & 0x3f));
			this.push(0x80 | (code & 0x3f));
		}
	}
};

module.exports = {
	Encoder: Encoder,
	encode: Encoder.encode
};
