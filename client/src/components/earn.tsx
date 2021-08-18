import {useState, useEffect, useContext} from "react"
import {useHistory} from "react-router-dom"
import {CapitalProvider, fetchCapitalProviderData, fetchPoolData, PoolData} from "../ethereum/pool"
import {AppContext} from "../App"
import {ERC20, usdcFromAtomic} from "../ethereum/erc20"
import {croppedAddress, displayDollars, displayPercent, roundDownPenny} from "../utils"
import {GoldfinchProtocol} from "../ethereum/GoldfinchProtocol"
import {PoolBacker, TranchedPool} from "../ethereum/tranchedPool"
import {PoolCreated} from "../typechain/web3/GoldfinchFactory"
import BigNumber from "bignumber.js"
import {User} from "../ethereum/user"

function PoolList({title, children}) {
  return (
    <div className="pools-list table-spaced background-container">
      <div className="table-header background-container-inner">
        <div className="table-cell col40 title">{title}</div>
        <div className="table-cell col22 numeric">Your Balance</div>
        <div className="table-cell col22 numeric">Est. APY</div>
        <div className="table-cell col16"></div>
      </div>
      {children}
    </div>
  )
}

function PortfolioOverview({
  poolData,
  capitalProvider,
  poolBackers,
}: {
  poolData?: PoolData
  capitalProvider?: CapitalProvider
  poolBackers?: PoolBacker[]
}) {
  if (!poolData?.loaded || !capitalProvider?.loaded || !poolBackers) {
    return <></>
  }

  let totalBalance = capitalProvider.availableToWithdrawInDollars
  let totalUnrealizedGains = capitalProvider.unrealizedGainsInDollars
  let estimatedAnnualGrowth = capitalProvider.availableToWithdrawInDollars.multipliedBy(poolData.estimatedApy)
  poolBackers.forEach((p) => {
    totalBalance = totalBalance.plus(p.balanceInDollars)
    totalUnrealizedGains = totalUnrealizedGains.plus(p.unrealizedGainsInDollars)
    const estimatedJuniorApy = p.tranchedPool.estimateJuniorAPY(p.tranchedPool.estimatedLeverageRatio)
    estimatedAnnualGrowth = estimatedAnnualGrowth.plus(p.balanceInDollars.multipliedBy(estimatedJuniorApy))
  })
  let unrealizedAPY = totalUnrealizedGains.dividedBy(totalBalance)
  let estimatedAPY = estimatedAnnualGrowth.dividedBy(totalBalance)

  return (
    <div className="background-container">
      <div className="background-container-inner">
        <div className="deposit-status-item">
          <div className="label">Portfolio balance</div>
          <div className="value">{displayDollars(totalBalance)}</div>
          <div className="sub-value">
            {displayDollars(roundDownPenny(totalUnrealizedGains))} ({displayPercent(unrealizedAPY)})
          </div>
        </div>
        <div className="deposit-status-item">
          <div className="label">Est. Annual Growth</div>
          <div className="value">{displayDollars(roundDownPenny(estimatedAnnualGrowth))}</div>
          <div className="sub-value">{`${displayPercent(estimatedAPY)} APY`}</div>
        </div>
      </div>
    </div>
  )
}

function SeniorPoolCard({balance, userBalance, apy}) {
  const history = useHistory()

  return (
    <div key="senior-pool" className="table-row background-container-inner">
      <div className="table-cell col40">
        {balance}
        <span className="subheader">Total Pool Balance</span>
      </div>
      <div className="table-cell col22 numeric">{userBalance}</div>
      <div className="table-cell col22 numeric">{apy}</div>
      <div className="table-cell col16 ">
        <button className="view-button" onClick={() => history.push("/earn/pools/senior")}>
          View
        </button>
      </div>
    </div>
  )
}

function TranchedPoolCard({poolBacker}: {poolBacker: PoolBacker}) {
  const history = useHistory()
  const tranchedPool = poolBacker.tranchedPool
  const leverageRatio = tranchedPool.estimatedLeverageRatio

  let estimatedApy = new BigNumber(NaN)
  let disabledClass = ""
  if (leverageRatio) {
    estimatedApy = tranchedPool.estimateJuniorAPY(leverageRatio)
  }

  if (poolBacker?.tokenInfos.length === 0) {
    disabledClass = "disabled"
  }

  return (
    <div className="table-row background-container-inner">
      <div className="table-cell col40 pool-info">
        <img
          className={`icon ${process.env.NODE_ENV === "development" && "pixelated"}`}
          src={tranchedPool.metadata?.icon}
          alt="pool-icon"
        />
        <div className="name">
          <span>{tranchedPool.metadata?.name ?? croppedAddress(tranchedPool.address)}</span>
          <span className="subheader">{tranchedPool.metadata?.category}</span>
        </div>
      </div>
      <div className={`${disabledClass} table-cell col22 numeric`}>{displayDollars(poolBacker?.balanceInDollars)}</div>
      <div className="table-cell col22 numeric">{displayPercent(estimatedApy)}</div>
      <div className="table-cell col16 ">
        <button className="view-button" onClick={() => history.push(`/earn/pools/junior/${tranchedPool.address}`)}>
          View
        </button>
      </div>
    </div>
  )
}

function usePoolBackers({goldfinchProtocol, user}: {goldfinchProtocol?: GoldfinchProtocol; user?: User}): {
  backers: PoolBacker[]
  status: string
} {
  let [backers, setBackers] = useState<PoolBacker[]>([])
  let [status, setStatus] = useState<string>("loading")

  useEffect(() => {
    async function loadTranchedPools(goldfinchProtocol: GoldfinchProtocol, user: User) {
      let poolEvents = (await goldfinchProtocol.queryEvents("GoldfinchFactory", [
        "PoolCreated",
      ])) as unknown as PoolCreated[]
      let poolAddresses = poolEvents.map((e) => e.returnValues.pool)
      let tranchedPools = poolAddresses.map((a) => new TranchedPool(a, goldfinchProtocol))
      await Promise.all(tranchedPools.map((p) => p.initialize()))
      const activePoolBackers = tranchedPools
        .filter((p) => !p.creditLine.limit.isZero())
        .map((p) => new PoolBacker(user.address, p, goldfinchProtocol))
      await Promise.all(activePoolBackers.map((b) => b.initialize()))
      setBackers(activePoolBackers.sort((a, b) => b.balanceInDollars.comparedTo(a.balanceInDollars)))
      setStatus("loaded")
    }

    if (goldfinchProtocol && user?.loaded) {
      loadTranchedPools(goldfinchProtocol, user)
    }
  }, [goldfinchProtocol, user])

  return {backers: backers, status}
}

function Earn(props) {
  const {pool, usdc, user, goldfinchProtocol} = useContext(AppContext)
  const [capitalProvider, setCapitalProvider] = useState<CapitalProvider>()
  const [poolData, setPoolData] = useState<PoolData>()
  const {backers, status: tranchedPoolsStatus} = usePoolBackers({goldfinchProtocol, user})

  useEffect(() => {
    async function refreshAllData() {
      const capitalProviderAddress = user.loaded && user.address
      refreshPoolData(pool, usdc!)
      refreshCapitalProviderData(pool, capitalProviderAddress)
    }

    if (pool) {
      refreshAllData()
    }
  }, [pool, usdc, user])

  async function refreshCapitalProviderData(pool: any, address: string | boolean) {
    const capitalProvider = await fetchCapitalProviderData(pool, address)
    setCapitalProvider(capitalProvider)
  }

  async function refreshPoolData(pool: any, usdc: ERC20) {
    const poolData = await fetchPoolData(pool, usdc && usdc.contract)
    setPoolData(poolData)
  }

  let earnMessage = "Loading..."
  if (capitalProvider?.loaded || user.noWeb3) {
    earnMessage = "Earn"
  }

  return (
    <div className="content-section">
      <div className="page-header">
        <div>{earnMessage}</div>
      </div>
      <PortfolioOverview poolData={poolData} capitalProvider={capitalProvider} poolBackers={backers} />
      <div className="pools">
        <PoolList title="Senior Pool">
          <SeniorPoolCard
            balance={displayDollars(usdcFromAtomic(poolData?.totalPoolAssets))}
            userBalance={displayDollars(capitalProvider?.availableToWithdrawInDollars)}
            apy={displayPercent(poolData?.estimatedApy)}
          />
        </PoolList>
        <PoolList title="Junior Pools">
          {tranchedPoolsStatus === "loading"
            ? "Loading..."
            : backers.map((p) => <TranchedPoolCard key={`${p.tranchedPool.address}`} poolBacker={p} />)}
        </PoolList>
      </div>
    </div>
  )
}

export default Earn
