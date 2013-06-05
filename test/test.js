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
			assert.deepEqual(zson.encode(64), toUint8Array([ 0x80, 64 ]));
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
			assert.deepEqual(zson.encode(-118.625), toUint8Array([ 0xf2, 0xc0, 0x5d, 0xa8, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
		});
		it("should encode string", function () {
			assert.deepEqual(zson.encode(""), toUint8Array([ 0xf8, 0xff ]));
			assert.deepEqual(zson.encode("hello"), toUint8Array([ 0xf8, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xff ]));
			assert.deepEqual(zson.encode("\u65e5\u672c\u8a9e"), toUint8Array([ 0xf8, 0xe6, 0x97, 0xa5, 0xe6, 0x9c, 0xac, 0xe8, 0xaa, 0x9e, 0xff ]));
		});
		it("should encode other scalars", function () {
			assert.deepEqual(zson.encode((function () {})() /* undefined */), toUint8Array([ 0xf3 ]));
			assert.deepEqual(zson.encode(null), toUint8Array([ 0xf3 ]));
			assert.deepEqual(zson.encode(false), toUint8Array([ 0xf4 ]));
			assert.deepEqual(zson.encode(true), toUint8Array([ 0xf5 ]));
		});
		it("should encode array", function () {
			assert.deepEqual(zson.encode([ 1, 2, 3 ]), toUint8Array([ 0xf6, 1, 2, 3, 0xff ]));
		});
		it("should encode object", function() {
			assert.deepEqual(zson.encode({ a: 1 }), toUint8Array([ 0xf7, 0x61, 0xff, 1, 0xff ]));
		});
	});
});
