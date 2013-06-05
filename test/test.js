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

var assert = require("assert");

var zson = require("../zson.js");

function toUint8Array(src) {
	var ret = new Uint8Array(src.length);
	for (var i = 0; i != src.length; ++i) {
		ret[i] = src[i];
	}
	return ret;
}

describe("Encoder", function () {
	describe("encode", function () {
		it("should encode 1-byte number", function () {
			assert.deepEqual(zson.encode(0), toUint8Array([ 0 ]));
			assert.deepEqual(zson.encode(1), toUint8Array([ 1 ]));
			assert.deepEqual(zson.encode(63), toUint8Array([ 63 ]));
			assert.deepEqual(zson.encode(-1), toUint8Array([ 127 ]));
			assert.deepEqual(zson.encode(-64), toUint8Array([ 64 ]));
		});
		it("should encode 2-byte number", function () {
			assert.deepEqual(zson.encode(64), toUint8Array([ 0x80, 0x40 ]));
			assert.deepEqual(zson.encode(8191), toUint8Array([ 0x9f, 0xff ]));
			assert.deepEqual(zson.encode(-65), toUint8Array([ 0xbf, 0xbf ]));
			assert.deepEqual(zson.encode(-8192), toUint8Array([ 0xa0, 0x00 ]));
		});
		it("should encode 3-byte number", function () {
			assert.deepEqual(zson.encode(8192), toUint8Array([ 0xc0, 0x20, 0x00 ]));
			assert.deepEqual(zson.encode(1048575), toUint8Array([ 0xcf, 0xff, 0xff ]));
			assert.deepEqual(zson.encode(-8193), toUint8Array([ 0xdf, 0xdf, 0xff ]));
			assert.deepEqual(zson.encode(-1048576), toUint8Array([ 0xd0, 0x00, 0x00 ]));
		});
		it("should encode 4-byte number", function () {
			assert.deepEqual(zson.encode(1048576), toUint8Array([ 0xe0, 0x10, 0x00, 0x00 ]));
			assert.deepEqual(zson.encode(134217727), toUint8Array([ 0xe7, 0xff, 0xff, 0xff ]));
			assert.deepEqual(zson.encode(-1048577), toUint8Array([ 0xef, 0xef, 0xff, 0xff ]));
			assert.deepEqual(zson.encode(-134217728), toUint8Array([ 0xe8, 0x00, 0x00, 0x00 ]));
		});
		it("should encode 5-byte number", function () {
			assert.deepEqual(zson.encode(134217728), toUint8Array([ 0xf0, 0x08, 0x00, 0x00, 0x00 ]));
			assert.deepEqual(zson.encode(2147483647), toUint8Array([ 0xf0, 0x7f, 0xff, 0xff, 0xff ]));
			assert.deepEqual(zson.encode(-134217729), toUint8Array([ 0xf0, 0xf7, 0xff, 0xff, 0xff ]));
			assert.deepEqual(zson.encode(-2147483648), toUint8Array([ 0xf0, 0x80, 0x00, 0x00, 0x00 ]));
		});
		it("should encode float", function () {
			assert.deepEqual(zson.encode(-118.625, { USE_FLOAT32: true }), toUint8Array([ 0xf1, 0xc2, 0xed, 0x40, 0x00 ]));
			assert.deepEqual(zson.encode(-118.625), toUint8Array([ 0xf2, 0xc0, 0x5d, 0xa8, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
		});
		it("should encode string", function () {
			assert.deepEqual(zson.encode(""), toUint8Array([ 0xfc, 0xff ]));
			assert.deepEqual(zson.encode("hello"), toUint8Array([ 0xfc, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xff ]));
			assert.deepEqual(zson.encode("\u65e5\u672c\u8a9e"), toUint8Array([ 0xfc, 0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac, 0xe8, 0xaa, 0x9e, 0xff ]));
		});
		it("should encode other scalars", function () {
			assert.deepEqual(zson.encode((function () {})() /* undefined */), toUint8Array([ 0xf3 ]));
			assert.deepEqual(zson.encode(null), toUint8Array([ 0xf3 ]));
			assert.deepEqual(zson.encode(false), toUint8Array([ 0xf4 ]));
			assert.deepEqual(zson.encode(true), toUint8Array([ 0xf5 ]));
		});
		it("should encode array", function () {
			assert.deepEqual(zson.encode([ 1, 2, 3 ]), toUint8Array([ 0xfd, 1, 2, 3, 0xff ]));
		});
		it("should encode object", function() {
			assert.deepEqual(zson.encode({ a: 1 }), toUint8Array([ 0xfe, 1, 0x61, 0xff, 0xff ]));
		});
	});
});

describe("Decoder", function () {
	describe("encode", function () {
		it("should decode 1-byte number", function () {
			assert.equal(zson.decode([ 0 ]), 0);
			assert.equal(zson.decode([ 1 ]), 1);
			assert.equal(zson.decode([ 63 ]), 63);
			assert.equal(zson.decode([ 127 ]), -1);
			assert.equal(zson.decode([ 64 ]), -64);
		});
		it("should decode 2-byte number", function () {
			assert.equal(zson.decode([ 0x80, 0x40 ]), 64);
			assert.equal(zson.decode([ 0x9f, 0xff ]), 8191);
			assert.equal(zson.decode([ 0xbf, 0xbf ]), -65);
			assert.equal(zson.decode([ 0xa0, 0x00 ]), -8192);
		});
		it("should decode 3-byte number", function () {
			assert.equal(zson.decode([ 0xc0, 0x20, 0x00 ]), 8192);
			assert.equal(zson.decode([ 0xcf, 0xff, 0xff ]), 1048575);
			assert.equal(zson.decode([ 0xdf, 0xdf, 0xff ]), -8193);
			assert.equal(zson.decode([ 0xd0, 0x00, 0x00 ]), -1048576);
		});
		it("should decode 4-byte number", function () {
			assert.equal(zson.decode([ 0xe0, 0x10, 0x00, 0x00 ]), 1048576);
			assert.equal(zson.decode([ 0xe7, 0xff, 0xff, 0xff ]), 134217727);
			assert.equal(zson.decode([ 0xef, 0xef, 0xff, 0xff ]), -1048577);
			assert.equal(zson.decode([ 0xe8, 0x00, 0x00, 0x00 ]), -134217728);
		});
		it("should decode 5-byte number", function () {
			assert.equal(zson.decode([ 0xf0, 0x08, 0x00, 0x00, 0x00 ]), 134217728);
			assert.equal(zson.decode([ 0xf0, 0x7f, 0xff, 0xff, 0xff ]), 2147483647);
			assert.equal(zson.decode([ 0xf0, 0xf7, 0xff, 0xff, 0xff ]), -134217729);
			assert.equal(zson.decode([ 0xf0, 0x80, 0x00, 0x00, 0x00 ]), -2147483648);
		});
		it("should decode float", function () {
			assert.equal(zson.decode([ 0xf1, 0xc2, 0xed, 0x40, 0x00 ]), -118.625);
			assert.equal(zson.decode([ 0xf2, 0xc0, 0x5d, 0xa8, 0x00, 0x00, 0x00, 0x00, 0x00 ]), -118.625);
		});
		it("should decode string", function () {
			assert.equal(zson.decode([ 0xfc, 0xff ]), "");
			assert.equal(zson.decode([ 0xfc, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xff ]), "hello");
			assert.equal(zson.decode([ 0xfc, 0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac, 0xe8, 0xaa, 0x9e, 0xff ]), "\u65e5\u672c\u8a9e");
		});
		it("should decode other scalars", function () {
			assert.equal(zson.decode([ 0xf3 ]), null);
			assert.equal(zson.decode([ 0xf4 ]), false);
			assert.equal(zson.decode([ 0xf5 ]), true);
		});
		it("should decode array", function () {
			assert.deepEqual(zson.decode([ 0xfd, 1, 2, 3, 0xff ]), [ 1, 2, 3 ]);
		});
		it("should decode object", function() {
			assert.deepEqual(zson.decode([ 0xfe, 1, 0x61, 0xff, 0xff ]), { a: 1 });
		});
	});
});
