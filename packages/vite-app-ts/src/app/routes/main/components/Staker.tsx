import { EtherscanProvider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { transactor, TTransactor } from 'eth-components/functions';
import { useBalance, useContractLoader, useEventListener, useGasPrice, useOnRepetition } from 'eth-hooks';
import { useEthersContext } from 'eth-hooks/context';
import React, { FC, useContext, useEffect, useState } from 'react';
import { useAppContracts } from '../hooks/useAppContracts';
import { Staker as StakerContract, ExampleExternalContract } from '~~/generated/contract-types';
import { Button, List } from 'antd';
import { Address, Balance } from 'eth-components/ant';
import { formatEther, parseEther } from '@ethersproject/units';
import { BigNumber } from 'ethers';
import { HumanizeDurationLanguage, HumanizeDuration } from 'humanize-duration-ts';
import { ethers } from 'ethers';
import { EthComponentsSettingsContext } from 'eth-components/models';
import { useDexEthPrice } from 'eth-hooks/dapps';

const langService: HumanizeDurationLanguage = new HumanizeDurationLanguage();
const humanizer: HumanizeDuration = new HumanizeDuration(langService);

export interface StakerProps {
  mainnetProvider: StaticJsonRpcProvider;
}

type TimeType = {
  days: String;
  hours: String;
  minutes: String;
  seconds: String;
}

export const Staker: FC<StakerProps> = (props) => {
  const { mainnetProvider } = props;

  const appContractConfig = useAppContracts();
  const ethersContext = useEthersContext();
  const readContracts = useContractLoader(appContractConfig);
  const writeContracts = useContractLoader(appContractConfig, ethersContext?.signer);

  const yourCurrentBalance = useBalance(ethersContext.account ?? '');

  const stakeContractRead = readContracts['Staker'] as StakerContract;
  const stakeContractWrite = writeContracts['Staker'] as StakerContract;
  const externalContractRead = readContracts['ExampleExternalContract'] as ExampleExternalContract;

  const ethComponentsSettings = useContext(EthComponentsSettingsContext);
  const gasPrice = useGasPrice(ethersContext.chainId, 'fast');
  const ethPrice = useDexEthPrice(mainnetProvider);
  const tx = transactor(ethComponentsSettings, ethersContext?.signer, gasPrice);

  const [ethAmount, setEthAmount] = useState<Number | String>(0);

  const [threshold, setThreshold] = useState<BigNumber>();
  useEffect(() => {
    const getThreshold = async () => {
      const threshold = await stakeContractRead?.threshold();
      console.log('💵 threshold:', threshold);
      setThreshold(threshold);
    };
    getThreshold();
  }, [yourCurrentBalance]);

  const [balanceStaked, setBalanceStaked] = useState<BigNumber>();
  useEffect(() => {
    const getBalanceStaked = async () => {
      const balanceStaked = await stakeContractRead?.balances(ethersContext?.account ?? '');
      console.log('💵 balanceStaked:', balanceStaked);
      setBalanceStaked(balanceStaked);
    };
    getBalanceStaked();
  }, [yourCurrentBalance]);

  const [timeLeft, setTimeLeft] = useState<BigNumber>();
  const [{days, hours, minutes, seconds}, setTime] = useState<TimeType>({
    days:'',
    hours:'',
    minutes:'',
    seconds: ''
  })

  useEffect(() =>{
    if(timeLeft && humanizer.humanize(timeLeft.toNumber() * 1000).length > 0 && humanizer.humanize(timeLeft.toNumber() * 1000).includes(',')){
      const t = humanizer.humanize(timeLeft.toNumber() * 1000).split(',')
      setTime((oldState) =>({
        ...oldState,
        days: t.filter(i=>i.includes('days'))[0].split(' ')[0],
        hours: t.filter(i=>i.includes('hours'))[0].split(' ')[1],
        minutes: t.filter(i=>i.includes('minutes'))[0].split(' ')[1],
        seconds: t.filter(i=>i.includes('seconds'))[0].split(' ')[1]
      })) 
    }
  }, [timeLeft])

  useEffect(() => {
    const getTimeLeft = async () => {
      const timeLeft = await stakeContractRead?.timeLeft();
      console.log('⏳ timeLeft:', timeLeft);
      setTimeLeft(timeLeft);
    };
    getTimeLeft();
  }, [yourCurrentBalance]);

  const [completed, setCompleted] = useState<boolean>(false);
  useEffect(() => {
    const getCompleted = async () => {
      const completed = await externalContractRead?.completed();
      console.log('✅ complete:', completed);
      setCompleted(completed);
    };
    getCompleted();
  }, [yourCurrentBalance]);

  // ** 📟 Listen for broadcast events
  const stakeEvents = useEventListener(stakeContractRead, 'Stake', 1);

  let completeDisplay = <></>;
  if (completed) {
    completeDisplay = (
      <div style={{ padding: 64, backgroundColor: '#eeffef', fontWeight: 'bolder' }}>
        🚀 🎖 👩‍🚀 - Staking App triggered `ExampleExternalContract` -- 🎉 🍾 🎊
        <Balance address={externalContractRead?.address} /> ETH staked!
      </div>
    );
  }


  return (
    <div className='flex justify-center'>

    <div className='w-1/2 flex flex-col pb-12'>
      {completeDisplay}

      <div className='flex mt-4 border rounded p-4  justify-around'>
        <div className='flex-col'><div className='text-3xl'>{days.toString()}</div> <div>days</div></div>
        <div className='flex-col'><div className='text-3xl'>{hours}</div> <div>hours</div></div>
        <div className='flex-col'><div className='text-3xl'>{minutes}</div> <div>minutes</div></div>
        <div className='flex-col'><div className='text-3xl'>{seconds}</div> <div>seconds</div></div>
      </div>
      <p className='mt-2'>Time until staking ends</p>

      <div className='flex mt-8 border rounded p-4 divide-x  items-center'>
        <div className='flex-col px-4'>
          <div >
            <Balance address={stakeContractRead?.address} />/
            <Balance address={undefined} balance={threshold} />
          </div>
          <div>Total staked:</div>
        </div>
        <div className='flex-col px-4'>
          <div >
            <Address address={stakeContractRead?.address} />
          </div>
          <div>Staker Contract:</div>
        </div>
      </div>  

      <div className='flex mt-8 border rounded p-4  justify-between items-center'>
        <div className='flex-col px-4'>
          <div >
          <Balance address={undefined} balance={balanceStaked} price={ethPrice} />
          </div>
          <div>Your staked:</div>
        </div>
        
        <div className='flex p-4  justify-between items-center'>  
         <div className='px-2'>
          <button onClick={() => {
              if (tx) {
                tx(stakeContractWrite.execute());
              }
            }} className="font-bold bg-pink-500 text-white rounded p-4 shadow-lg">
            📡 Execute!
            </button>
         </div>

          <div className='px-2'>
            <button onClick={() => {
                if (tx && ethersContext.account) {
                  tx(stakeContractWrite.withdraw(ethersContext.account));
                }
              }} className="font-bold bg-blue-500 text-white rounded p-4 shadow-lg">
            🏧 Withdraw
            </button>
          </div>
        </div>
        
      </div>

      <div className='flex mt-8 border rounded p-4  justify-between items-center'>
        <div>
          <input
            className="rounded-l p-4 text-gray-800"
            onChange={(e)=> {
              if(isNaN(Number(e.target.value)))return
              setEthAmount(e.target.value)
            }}
            value={ethAmount?.toString()}
            />
            
            <button onClick={() => {
                if (tx && ethersContext.account && ethAmount) {
                  tx(stakeContractWrite.transferEther({ value: ethers.utils.parseEther(ethAmount.toString()) }));
                  setEthAmount(0)
                }
              }} className="font-bold bg-pink-500 text-white rounded-r p-4 shadow-lg">
            Send Eth
            </button>
        </div>
        <div >
        <button onClick={() => {
              if (tx) {
                tx(stakeContractWrite.stake({ value: ethers.utils.parseEther('0.5') }));
              }
            }} 
            className="font-bold bg-blue-500 text-white rounded p-4 shadow-lg">
            🥩 Stake 0.5 ether!
            </button>
        </div>
      </div>


      <div style={{ width: 600, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>
        <h2>Events:</h2>
        <List
          bordered
          dataSource={stakeEvents}
          renderItem={(item: any) => {
            return (
              <List.Item
                key={item.blockNumber + '_' + item.sender + '_' + item.purpose}
                style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                  <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
                  <div>→</div>
                  <div>{formatEther(item.args[1])}</div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>
    </div>
    </div>
  );
};
