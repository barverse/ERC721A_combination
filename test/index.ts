import { expect } from "chai";
import { ethers } from "hardhat";
import BigNumber from "bignumber.js";

const name = "MyName";
const symbol = "TLK";
const maxSupply = 100;
const baseURI = "https://admin.com/";
const nftPrice = "25000000000000000";
const blindTokenURI = "http://blindToken/1.jpg";
const maxPerAddressMint = 5;
const teamMint = 5;

const exceptStr = (input: string): string => {
  return `VM Exception while processing transaction: reverted with reason string '${input}'`;
};

const gasFee = (res: any) => {
  const { cumulativeGasUsed, effectiveGasPrice } = res;
  return cumulativeGasUsed.mul(effectiveGasPrice);
};

describe("ERC721A", async function () {
  it("check setting", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const ERC = await ethers.getContractFactory("ERC721ACombination");
    const erc = await ERC.deploy(
      name,
      symbol,
      maxSupply,
      baseURI,
      nftPrice,
      blindTokenURI,
      maxPerAddressMint,
      teamMint,
    );
    await erc.deployed();

    // 檢查設定
    expect(await erc.name()).to.equal(name);
    expect(await erc.symbol()).to.equal(symbol);
    expect(await erc.maxSupply()).to.equal(maxSupply);
    expect(await erc.baseURI()).to.equal(baseURI);
    expect((await erc.nftPrice()).toString()).to.equal(nftPrice);
    expect(await erc.blindTokenURI()).to.equal(blindTokenURI);
    expect(await erc.maxPerAddressMint()).to.equal(maxPerAddressMint);
    expect(await erc.balanceOf(owner.address)).to.equal(teamMint);
    expect(await erc.paused()).to.equal(true);

    // 檢查輸入設定

    // new BaseURI
    const newURI = "https://admin2.com/";
    try {
      await erc.connect(addr1).setBaseURI(newURI);
      expect(1).to.equal(0);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.baseURI()).to.equal(baseURI);
    const set = await erc.setBaseURI(newURI);
    await set.wait();
    expect(await erc.baseURI()).to.equal(newURI);

    // newBlind URI
    const newBlindURI = "https://blindURI";
    try {
      await erc.connect(addr1).setBlindTokenURI(newBlindURI);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.blindTokenURI()).to.equal(blindTokenURI);
    const set2 = await erc.setBlindTokenURI(newBlindURI);
    await set2.wait();
    expect(await erc.blindTokenURI()).to.equal(newBlindURI);

    // new Price
    const newPrice = "350000000000000000";
    try {
      await erc.connect(addr1).setNftPrice(newPrice);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect((await erc.nftPrice()).toString()).to.equal(nftPrice);
    const setPrice = await erc.setNftPrice(newPrice);
    await setPrice.wait();
    expect((await erc.nftPrice()).toString()).to.equal(newPrice);

    // new MaxPerAddressMint
    const newMaxPerAddressMint = 10;
    try {
      await erc.connect(addr1).setMaxPerAddressMint(newMaxPerAddressMint);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.maxPerAddressMint()).to.equal(maxPerAddressMint);
    const setMax = await erc.setMaxPerAddressMint(newMaxPerAddressMint);
    await setMax.wait();
    expect(await erc.maxPerAddressMint()).to.equal(newMaxPerAddressMint);
  });
  it("mint, allowlist mint", async () => {
    const ERC = await ethers.getContractFactory("ERC721ACombination");
    const erc = await ERC.deploy(
      name,
      symbol,
      maxSupply,
      baseURI,
      nftPrice,
      blindTokenURI,
      maxPerAddressMint,
      teamMint,
    );
    await erc.deployed();

    const [owner, addr1, addr2] = await ethers.getSigners();
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    console.table([owner, addr1, addr2]);

    try {
      await erc.mint(1, { value: nftPrice });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Pausable: paused"));
    }

    try {
      await erc.connect(addr1).unpause();
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }

    const unpause = await erc.unpause();
    await unpause.wait();

    // test blind token
    const mint = await erc.connect(addr1).mint(1, { value: nftPrice });
    const res = await mint.wait();
    const tokenId = res.events![0].args![2];
    expect(tokenId).to.equal("5");
    expect(await erc.tokenURI(tokenId)).to.equal(blindTokenURI);
    expect(await erc.ownerOf(tokenId)).to.equal(await addr1.address);

    // test blind token unBlind
    const mint2 = await erc.connect(addr2).mint(1, { value: nftPrice });
    const res2 = await mint2.wait();
    const token2Id = res2.events![0].args![2];
    expect(token2Id.toString()).to.equal("6");
    await erc.setBlindBoxOpened(true);
    expect(await erc.tokenURI(token2Id)).to.equal(baseURI + token2Id.toString());
    expect(await erc.ownerOf(token2Id)).to.equal(await addr2.address);

    // quantity mint
    const weiPrice = new BigNumber(nftPrice);
    const mintQuantity = 3;
    const mint3 = await erc
      .connect(addr2)
      .mint(mintQuantity, { value: weiPrice.times(mintQuantity).toString() });
    const res3 = await mint3.wait();
    for (let i = 0; i < res3.events!.length; i++) {
      expect(await erc.ownerOf(res3.events![i].args![2])).to.equal(await addr2.address);
    }

    // over max mint
    try {
      await erc.connect(addr2).mint(5, { value: weiPrice.times(5).toString() });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("can not mint this many"));
    }
  });
  it("allowlist mint", async () => {
    const ERC = await ethers.getContractFactory("ERC721ACombination");
    const erc = await ERC.deploy(
      name,
      symbol,
      maxSupply,
      baseURI,
      nftPrice,
      blindTokenURI,
      maxPerAddressMint,
      teamMint,
    );
    await erc.deployed();

    const [, addr1, addr2] = await ethers.getSigners();
    // pause mint
    try {
      await erc.allowlistMint(1, { value: 0 });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Pausable: paused"));
    }
    // check owner
    try {
      await erc.connect(addr1).seedAllowlist([addr1.address], [5]);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }

    const unpause = await erc.allowlistUnpause();
    await unpause.wait();

    // check allowlist mint
    const seed = await erc.seedAllowlist([addr1.address], [1]);
    await seed.wait();
    const mint = await erc.connect(addr1).allowlistMint(1, { value: 0 });
    await mint.wait();
    expect(await erc.balanceOf(addr1.address)).to.equal(1);

    // check allowlist set
    try {
      await erc.connect(addr1).allowlistMint(1, { value: 0 });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("not eligible for allowlist mint"));
    }

    // check pause mint
    const pause = await erc.allowlistPause();
    await pause.wait();
    try {
      const seed = await erc.seedAllowlist([addr1.address], [1]);
      await seed.wait();
      await erc.connect(addr1).allowlistMint(1, { value: 0 });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Pausable: paused"));
    }
    const unPause = await erc.allowlistUnpause();
    await unPause.wait();

    // set price
    const newPrice = 1;
    const wai = ethers.utils.parseUnits(newPrice.toString(), "ether");
    const setAllowPrice = await erc.setAllowlistNftPrice(wai);
    await setAllowPrice.wait();
    expect(+ethers.utils.formatEther(await erc.allowlistNftPrice())).to.equal(newPrice);
    const seedAddr2 = await erc.seedAllowlist([addr2.address], [3]);
    await seedAddr2.wait();
    const addr2Mint = await erc.connect(addr2).allowlistMint(3, { value: wai.mul(3).toString() });
    await addr2Mint.wait();
    expect(await erc.balanceOf(addr2.address)).to.equal(3);

    // over mint
    try {
      const seedAddr2 = await erc.seedAllowlist([addr2.address], [3]);
      await seedAddr2.wait();
      await erc.connect(addr2).allowlistMint(5, { value: wai.mul(5).toString() });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("can not mint this many"));
    }
  });
  it("member", async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC = await ethers.getContractFactory("ERC721ACombination");
    const erc = await ERC.deploy(
      name,
      symbol,
      maxSupply,
      baseURI,
      nftPrice,
      blindTokenURI,
      maxPerAddressMint,
      teamMint,
    );
    await erc.deployed();

    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const minterCount = (await erc.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).toNumber();
    const members = [];
    for (let i = 0; i < minterCount; ++i) {
      members.push(await erc.getRoleMember(DEFAULT_ADMIN_ROLE, i));
    }
    expect(members.length).to.equal(1);
    expect(members[0]).to.equal(owner.address);

    try {
      await erc.connect(addr1).addMember(addr1.address);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Ownable: caller is not the owner"));
    }
    expect(members.length).to.equal(1);
    expect(members[0]).to.equal(owner.address);

    const addMember = await erc.addMember(addr1.address);
    await addMember.wait();
    const addr1IsMember = await erc.isMember(addr1.address);
    expect(addr1IsMember).to.equal(true);
    const addr2IsMember = await erc.isMember(addr2.address);
    expect(addr2IsMember).to.equal(false);

    const minterCount2 = (await erc.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).toNumber();
    const members2 = [];
    for (let i = 0; i < minterCount2; ++i) {
      members2.push(await erc.getRoleMember(DEFAULT_ADMIN_ROLE, i));
    }
    expect(members2.length).to.equal(2);
    expect(members2[0]).to.equal(owner.address);
    expect(members2[1]).to.equal(addr1.address);

    try {
      await erc.connect(addr2).addMember(addr1.address);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Ownable: caller is not the owner"));
    }

    // set baseURI
    const newBaseURI = "baseURI";
    try {
      await erc.connect(addr2).setBaseURI(newBaseURI);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.connect(addr1).baseURI()).not.to.equal(newBaseURI);
    const setBaseURI = await erc.connect(addr1).setBaseURI(newBaseURI);
    await setBaseURI.wait();
    expect(await erc.baseURI()).to.equal(newBaseURI);

    // set NFT price
    const newPrice = 1;
    const wai = ethers.utils.parseUnits(newPrice.toString(), "ether");
    try {
      await erc.connect(addr2).setNftPrice(wai);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.nftPrice()).not.to.equal(wai);
    await (await erc.connect(addr1).setNftPrice(wai)).wait();
    expect(await erc.nftPrice()).to.equal(wai);

    // set Max PerAddress Mint
    const maxMint = 10;
    try {
      await erc.connect(addr2).setMaxPerAddressMint(maxMint);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.maxPerAddressMint()).not.to.equal(maxMint);
    await (await erc.connect(addr1).setMaxPerAddressMint(maxMint)).wait();
    expect(await erc.maxPerAddressMint()).to.equal(maxMint);

    // pause
    expect(await erc.paused()).to.equal(true);
    try {
      await erc.connect(addr2).unpause();
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.paused()).to.equal(true);
    try {
      await erc.connect(addr2).pause();
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    await (await erc.connect(addr1).unpause()).wait();
    expect(await erc.paused()).to.equal(false);

    await (await erc.connect(addr2).mint(1, { value: wai })).wait();

    await (await erc.connect(addr1).pause()).wait();
    expect(await erc.paused()).to.equal(true);
    try {
      await erc.connect(addr2).mint(1, { value: wai });
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Pausable: paused"));
    }

    // set blind box
    const blindBoxURI = "blindBoxURI";
    try {
      await erc.connect(addr2).setBlindTokenURI(blindBoxURI);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.blindTokenURI()).not.to.equal(blindBoxURI);
    await (await erc.connect(addr1).setBlindTokenURI(blindBoxURI)).wait();
    expect(await erc.blindTokenURI()).to.equal(blindBoxURI);

    expect(await erc.tokenURI(0)).to.equal(blindBoxURI);

    try {
      await erc.connect(addr2).setBlindBoxOpened(true);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.tokenURI(0)).to.equal(blindBoxURI);
    await (await erc.connect(addr1).setBlindBoxOpened(true)).wait();
    expect(await erc.tokenURI(0)).to.equal(newBaseURI + "0");
    try {
      await erc.connect(addr2).setBlindBoxOpened(false);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.tokenURI(0)).to.equal(newBaseURI + "0");
    await (await erc.connect(addr1).setBlindBoxOpened(false)).wait();
    expect(await erc.tokenURI(0)).to.equal(blindBoxURI);

    // allow list
    expect(await erc.allowlistPaused()).to.equal(true);
    try {
      await erc.connect(addr2).allowlistUnpause();
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.allowlistPaused()).to.equal(true);
    try {
      await erc.connect(addr2).allowlistPause();
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.connect(addr1).allowlistPaused()).to.equal(true);
    await (await erc.connect(addr1).allowlistUnpause()).wait();
    expect(await erc.allowlistPaused()).to.equal(false);
    await (await erc.connect(addr1).allowlistPause()).wait();
    expect(await erc.allowlistPaused()).to.equal(true);

    expect(await erc.allowlist(addr1.address)).to.equal(0);
    try {
      await erc.connect(addr2).seedAllowlist([addr1.address], [5]);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
    expect(await erc.allowlist(addr1.address)).to.equal(0);
    await (await erc.connect(addr1).seedAllowlist([addr1.address], [5])).wait();
    expect(await erc.allowlist(addr1.address)).to.equal(5);

    // sharing
    try {
      await erc.connect(addr1).updateSharing([owner.address, addr2.address], [50, 50]);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Ownable: caller is not the owner"));
    }
    await (await erc.updateSharing([owner.address, addr2.address], [50, 50])).wait();

    // remove member
    await (await erc.removeMember(addr1.address)).wait();
    try {
      await erc.connect(addr1).setBaseURI("AAA");
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Restricted to members."));
    }
  });
  it("withdraw", async () => {
    const newPrice = 3;
    const nftPrice = ethers.utils.parseUnits(newPrice.toString(), "ether");

    const ERC = await ethers.getContractFactory("ERC721ACombination");
    const erc = await ERC.deploy(
      name,
      symbol,
      15,
      baseURI,
      nftPrice,
      blindTokenURI,
      maxPerAddressMint,
      8,
    );
    await erc.deployed();

    const [owner, whitelist1, whitelist2, member, minter, sharing1, sharing2, sharing3] =
      await ethers.getSigners();

    // set sharing
    const share1 = 25;
    const share2 = 70;
    const share3 = 5;
    await (
      await erc.updateSharing(
        [owner.address, sharing1.address, sharing2.address, sharing3.address],
        [0, 20, 30, 50],
      )
    ).wait();

    await (
      await erc.updateSharing(
        [owner.address, sharing1.address, sharing2.address, sharing3.address],
        [0, share1, share2, share3],
      )
    ).wait();

    const sharingMember: any = [];
    const sharingCount = (await erc.getSharingMemberCount()).toNumber();
    for (let i = 0; i < sharingCount; i++) {
      const sharing = await erc.getSharingMember(i);
      sharingMember.push(sharing);
    }
    console.table(sharingMember);
    expect(sharingMember[0][0]).to.equal(sharing1.address);
    expect(sharingMember[0][1]).to.equal(share1);
    expect(sharingMember[1][0]).to.equal(sharing2.address);
    expect(sharingMember[1][1]).to.equal(share2);
    expect(sharingMember[2][0]).to.equal(sharing3.address);
    expect(sharingMember[2][1]).to.equal(share3);

    // add manager
    await (await erc.addMember(member.address)).wait();

    // allowlist free mint
    await (await erc.allowlistUnpause()).wait();
    await (await erc.seedAllowlist([whitelist1.address], [1])).wait();
    const whitelist1Balance1 = await whitelist1.getBalance();
    const r1 = await (await erc.connect(whitelist1).allowlistMint(1, { value: 0 })).wait();
    const gasFee1 = gasFee(r1);
    const whitelist1Balance2 = await whitelist1.getBalance();
    expect(whitelist1Balance2.add(gasFee1)).to.equal(whitelist1Balance1);

    // allowlist mint
    const am = 1;
    const allowlistMintPrice = nftPrice.mul(3);
    await (await erc.setAllowlistNftPrice(allowlistMintPrice)).wait();
    await (await erc.seedAllowlist([whitelist2.address], [am])).wait();
    const whitelist2Balance1 = await whitelist2.getBalance();
    const r2 = await (
      await erc.connect(whitelist2).allowlistMint(am, { value: allowlistMintPrice.mul(am) })
    ).wait();
    const gasFee2 = gasFee(r2);
    const whitelist2Balance2 = await whitelist2.getBalance();
    expect(whitelist2Balance2.add(gasFee2).add(allowlistMintPrice.mul(am))).to.equal(
      whitelist2Balance1,
    );

    // normal mint
    const unpause = await erc.unpause();
    await unpause.wait();

    const m = 5;
    const mintBalance1 = await minter.getBalance();
    const mint = await erc.connect(minter).mint(m, { value: nftPrice.mul(m) });
    const res = await mint.wait();

    const mintBalance2 = await minter.getBalance();
    expect(mintBalance2.add(nftPrice.mul(m)).add(gasFee(res))).to.equal(mintBalance1);

    // check contract balance
    const contractBalance = await ethers.provider.getBalance(erc.address);
    expect(contractBalance).to.equal(allowlistMintPrice.mul(am).add(nftPrice.mul(m)).toString());
    const contractBalanceToEth = ethers.utils.formatEther(contractBalance);

    // withdraw
    const draw = await erc.connect(member).withdraw();
    await draw.wait();

    expect((+contractBalanceToEth * share1) / 100 + 10000).to.equal(
      +ethers.utils.formatEther(await sharing1.getBalance()),
    );

    expect((+contractBalanceToEth * share2) / 100 + 10000).to.equal(
      +ethers.utils.formatEther(await sharing2.getBalance()),
    );

    expect((+contractBalanceToEth * share3) / 100 + 10000).to.equal(
      +ethers.utils.formatEther(await sharing3.getBalance()),
    );

    try {
      await erc.updateSharing([owner.address], [100]);
      expect(10).to.equal(5);
    } catch (error: any) {
      expect(error.message).to.equal(exceptStr("Sharing cannot be set after sale has ended"));
    }
  });
});
