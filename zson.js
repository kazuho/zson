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

function Encoder(pushCb, opts) {
	this.push = pushCb;
	this.encodeFloat = this.encodeFloat64; // default
	this.customEncoder = null; // default
	if (opts) {
		if (opts.USE_FLOAT32) {
			this.encodeFloat = this.encodeFloat32;
		}
		if (opts.CUSTOM_ENCODER) {
			this.customEncoder = opts.CUSTOM_ENCODER;
		}
	}
}

Encoder.encode = function (src, opts) {
	var output = [];
	new Encoder(function (octet) { output.push(octet); }, opts).encode(src);
	var typedOutput = new Uint8Array(output.length);
	for (var i = 0; i != output.length; ++i) {
		typedOutput[i] = output[i];
	}
	return typedOutput;
};

Encoder.prototype.encode = function encode(src) {
	if (this.customEncoder && this.customEncoder(src)) {
		return;
	}
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

Encoder.prototype.encodeFloat32 = function () {
	var view = new DataView(new ArrayBuffer(4));
	return function encodeFloat32(src) {
		this.push(0xf1);
		view.setFloat32(0, src);
		for (var i = 0; i != 4; ++i) {
			this.push(view.getUint8(i));
		}
	};
}();

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

function Decoder(src, opts) {
	if (opts) {
		if (opts.CUSTOM_DECODER) {
			this.decode = opts.CUSTOM_DECODER;
		}
	}
	// src is a function that returns the next char
	if (typeof src !== "function") {
		var offset = 0;
		src = function () {
			if (offset == this.length) {
				throw new Error("unexpected end-of-stream");
			}
			return this[offset++];
		}.bind(src);
	}
	var peeked = null;
	this.shift = function () {
		if (peeked !== null) {
			var ret = peeked;
			peeked = null;
			return ret;
		}
		return src();
		return s;
	};
	this.peek = function () {
		if (peeked === null) {
			peeked = src();
		}
		return peeked;
	};
}

Decoder.prototype.decode = function () {
	var view = new DataView(new ArrayBuffer(8));
	return function decodeCore() {
		var tag = this.shift();
		if (tag < 0xf0) {
			if (tag < 0x80) {
				return (tag << 25) >> 25;
			} else if (tag < 0xc0) {
				return ((tag << 26) | (this.shift() << 18)) >> 18;
			} else if (tag < 0xe0) {
				return ((tag << 27) | (this.shift() << 19) | (this.shift() << 11)) >> 11;
			} else {
				return ((tag << 28) | (this.shift() << 20) | (this.shift() << 12) | (this.shift() << 4)) >> 4;
			}
		} else {
			switch (tag) {
			case 0xf0:
				return (this.shift() << 24) | (this.shift() << 16) | (this.shift() << 8) | this.shift();
			case 0xf1:
				for (var i = 0; i < 4; ++i) {
					view.setUint8(i, this.shift());
				}
				return view.getFloat32(0);
			case 0xf2:
				for (var i = 0; i < 8; ++i) {
					view.setUint8(i, this.shift());
				}
				return view.getFloat64(0);
			case 0xf3:
				return null;
			case 0xf4:
				return false;
			case 0xf5:
				return true;
			case 0xfc:
				return this._decodeString();
			case 0xfd:
				return this._decodeArray();
			case 0xfe:
				return this._decodeObject();
			default:
				throw new Error("unexpected tag:" + tag);
			}
		}
	};
}();

Decoder.prototype._decodeString = function decodeString() {
	var ret = [], ch;
	while ((ch = this.shift()) !== 0xff) {
		if (ch < 0x80) {
			ret.push(ch);
		} else if (ch < 0xe0) {
			ret.push(((ch & 0x1f) << 6) | (this.shift() & 0x3f));
		} else if (ch < 0xf0) {
			ret.push(((ch & 0xf) << 12) | ((this.shift() & 0x3f) << 6) | (this.shift() & 0x3f));
		} else {
			throw new Error("FIXME support surrogate pair");
		}
	}
	return String.fromCharCode.apply(null, ret);
};

Decoder.prototype._decodeArray = function decodeArray() {
	var ret = [];
	while (this.peek() !== 0xff) {
		ret.push(this.decode());
	}
	this.shift();
	return ret;
};

Decoder.prototype._decodeObject = function decodeObject() {
	var ret = {};
	while (this.peek() !== 0xff) {
		var value = this.decode();
		var key = this._decodeString();
		ret[key] = value;
	}
	this.shift();
	return ret;
}

Decoder.decode = function decode(encoded, opts) {
	return new Decoder(encoded, opts).decode();
};


module.exports = {
	CUSTOM_TAGS: [ 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb ],
	Encoder: Encoder,
	encode: Encoder.encode,
	Decoder: Decoder,
	decode: Decoder.decode
};
