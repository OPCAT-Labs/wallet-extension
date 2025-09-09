export const testDecodedTx = {
  code: 0,
  msg: 'ok',
  data: {
    inputInfos: [
      {
        txid: 'e19512fb8177cb676faa44390fc757ce78934bf6495d5a6a50736123994ded78',
        vout: 1,
        address: 'tb1qkrewl9zclku2qngth52eezdyrwmjpcspttdypa',
        value: 546,
        onchain: true,
        height: 824479
      },
      {
        txid: 'f3abed06096fd2d6d294bf4133c6ee89e4438c4b3ea5cdf2336da09d7357db54',
        vout: 1,
        address: 'bc1p8tf3csd75fhlwe7u42hx92rgvxgu7vycjmslrppz4rd0gggv2t5qxpymsu',
        value: 24077,
        onchain: true,
        height: 824868
      }
    ],
    outputInfos: [
      {
        address: 'bc1p8tf3csd75fhlwe7u42hx92rgvxgu7vycjmslrppz4rd0gggv2t5qxpymsu',
        value: 546,
      },
      {
        address: 'bc1p8tf3csd75fhlwe7u42hx92rgvxgu7vycjmslrppz4rd0gggv2t5qxpymsu',
        value: 21745,
      }
    ],
    feeRate: '11.0',
    fee: 2332,
    isCompleted: true,
    risks: [
      {
        level: 'danger',
        title: 'Multiple assets detected',
        desc: 'This transaction mixed with multiple assets',
        type: 7
      },
      {
        type: 8,
        level: 'warning',
        title: 'High fee rate detected',
        desc: 'The fee rate is much higher than recommended fee rate'
      },
    ],

    features: {
      rbf: false
    },
  }
};
