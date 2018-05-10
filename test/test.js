const ENS = require('../index.js');
const assert = require('assert');
const async = require('async');
const fs = require('fs');
const solc = require('solc');
const TestRPC = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3();

let ens = null;
let ensRoot = null;
let accounts = null;
let deployens = null;

const registryInterface = [{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"label","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setOwner","outputs":[],"type":"function"}];

describe('ENS', () => {
	before(function(done) {
		this.timeout(50000);
		web3.setProvider(TestRPC.provider());
		//web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
		web3.eth.getAccounts(async (err, acct) => {
			if (acct) accounts = acct;
			const source = fs.readFileSync('test/ens.sol').toString();
			const compiled = solc.compile(source, 1);
			assert.equal(compiled.errors, undefined);
			const deployer = compiled.contracts[':DeployENS'];
			const deployensContract = new web3.eth.Contract(JSON.parse(deployer.interface));

			// Deploy the contract
			const newContractInstance = await deployensContract.deploy({
				data: deployer.bytecode
			})
			.send({
				from: accounts[0],
				gas: 4700000
			})
			.on('error', async (err) => { assert.fail(err); })
			deployens = newContractInstance;
			try {
				if (deployens.options.address != undefined) {
					const value = await deployens.methods.ens().call()
					ensRoot = value;
					ens = new ENS(web3.currentProvider, ensRoot);
					done();
				} else {
					assert.fail("Contract address is null", contract);
				}
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe('#resolve()', () => {
		it('should get resolver addresses', async () => {
			try {
				const addr = await ens.resolver('foo.eth').resolverAddress();
				assert.notEqual(addr, '0x0000000000000000000000000000000000000000');
				return;
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should resolve names', async () => {
			try {
				const result = await ens.resolver('foo.eth').addr()
				assert.equal(result, deployens._address);
				return
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should implement has()', async () => {
			var resolver = ens.resolver('foo.eth');
			try {
				return await Promise.all([
					async () => {
						const result = await resolver.has(web3.utils.asciiToHex('addr'))
						assert.equal(result, true);
					},
					async () => {
						const result = resolver.has(web3.utils.asciiToHex('blah'))
						assert.equal(result, false);
					}
				]);
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should error when the name record does not exist', async () => {
			try {
				const result = await ens.resolver('bar.eth').addr();
				assert.fail();
			} catch (err) {
				assert.ok(err.toString().indexOf('invalid JUMP') != -1, err);
				return;
			}
		});

		it('should error when the name does not exist', async () => {
			try {
				const result = await ens.resolver('quux.eth').addr();
				assert.fail();
			} catch (err) {
				assert.equal(err, ENS.NameNotFound);
				return;
			}
		});

		it('should permit name updates', async () => {
			try {
				const resolver = ens.resolver('bar.eth')
				await resolver.setAddr('0x0000000000000000000000000000000000012345');
				const result = await resolver.addr();
				assert.equal(result, '0x0000000000000000000000000000000000012345');
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should do reverse resolution', async () => {
			try {
				const resolver = ens.resolver('foo.eth');
				const reverse = await resolver.reverseAddr();
				const result = await reverse.name();
				assert.equal(result, "deployer.eth");
				return;
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should fetch ABIs from names', async () => {
			try {
				const abi = await ens.resolver('foo.eth').abi();
				assert.equal(abi.length, 2);
				assert.equal(abi[0].name, "test2");
				return;
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should fetch ABIs from reverse records', async () => {
			try {
				const abi = await ens.resolver('baz.eth').abi();
				assert.equal(abi.length, 2);
				assert.equal(abi[0].name, "test");
				return;
			} catch (err) {
				assert.fail(err);
			}
		});

		it('should fetch contract instances', async () => {
			try {
				const contract = await ens.resolver('baz.eth').contract();
				assert.ok(contract.methods.test != undefined);
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe('#owner()', function() {
		it('should return owner values', async () => {
			try {
				const result = await ens.owner('bar.eth');
				assert.equal(result, accounts[0]);
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe("#setSubnodeOwner", function() {
		it('should permit setting subnode owners', async () => {
			try {
				await ens.setSubnodeOwner('BAZ.bar.eth', accounts[0], {from: accounts[0]});
				const owner = await ens.owner('baz.bar.eth');
				assert.equal(owner, accounts[0]);
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe("#setResolver", function() {
		it('should permit resolver updates', async () => {
			try {
				const addr = '0x2341234123412341234123412341234123412341';
				await ens.setResolver('baz.bar.eth', addr);
				const address = await ens.resolver('baz.bar.eth').resolverAddress();
				assert.equal(address, addr);
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe("#setOwner", function() {
		it('should permit owner updates', async () => {
			try {
				const addr = '0x3412341234123412341234123412341234123412';
				await ens.setOwner('baz.bar.eth', addr);
				const owner = await ens.owner('baz.bar.eth');
				assert.equal(owner, addr);
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});

	describe("#reverse", function() {
		it('should look up reverse DNS records', async () => {
			try {
				const result = await ens.reverse(deployens._address).name();
				assert.equal(result, 'deployer.eth');
				return;
			} catch (err) {
				assert.fail(err);
			}
		});
	});
});
