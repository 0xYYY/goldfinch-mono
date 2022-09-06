import { gql } from "@apollo/client";
import { BigNumber, FixedNumber } from "ethers";

import { Heading } from "@/components/design-system";
import { formatCrypto } from "@/lib/format";
import {
  SupportedCrypto,
  useDashboardPageQuery,
} from "@/lib/graphql/generated";
import { sharesToUsdc } from "@/lib/pools";
import { useWallet } from "@/lib/wallet";

import { ExpandableHoldings } from "./expandable-holdings";

gql`
  query DashboardPage($userId: String!) {
    seniorPools {
      id
      latestPoolStatus {
        id
        sharePrice
      }
    }
    viewer @client {
      fiduBalance {
        token
        amount
      }
      curveLpBalance {
        token
        amount
      }
    }
    curvePool @client {
      usdcPerLpToken
    }
    tranchedPoolTokens(
      where: { user: $userId, principalAmount_gt: 0 }
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      principalAmount
      tranchedPool {
        id
        name @client
      }
    }
    seniorPoolStakedPositions(
      where: { user: $userId, amount_gt: 0, positionType: Fidu }
      orderBy: startTime
      orderDirection: desc
    ) {
      id
      amount
    }
  }
`;

export default function DashboardPage() {
  const { account } = useWallet();
  const { data, loading, error } = useDashboardPageQuery({
    variables: { userId: account?.toLowerCase() ?? "" },
  });

  return (
    <div>
      <Heading level={1} className="mb-12">
        Dashboard
      </Heading>
      {!account && !loading ? (
        <div className="text-lg font-medium text-clay-500">
          You must connect your wallet to view your dashboard
        </div>
      ) : error ? (
        <div className="text-clay-500">Error: {error.message}</div>
      ) : !data || loading ? (
        <div>Loading</div>
      ) : (
        <div>
          <Heading level={2} className="mb-9 !font-sans !text-3xl !font-normal">
            Portfolio summary
          </Heading>
          <Heading level={3} className="mb-6 !font-sans !text-xl">
            Holdings
          </Heading>
          <div className="space-y-3">
            {data.tranchedPoolTokens.length > 0 ? (
              <ExpandableHoldings
                title="Borrower Pool Positions"
                tooltip="Your investment in Goldfinch borrower pools. Each investment position is represented by an NFT."
                color="#ff0000"
                holdings={data.tranchedPoolTokens.map((token) => ({
                  name: token.tranchedPool.name,
                  percentage: 0,
                  quantity: BigNumber.from(1),
                  usdcValue: {
                    token: SupportedCrypto.Usdc,
                    amount: token.principalAmount,
                  },
                  url: `/pools/${token.tranchedPool.id}`,
                }))}
                quantityFormatter={(n: BigNumber) =>
                  `${n.toString()} NFT${n.gt(BigNumber.from(1)) ? "s" : ""}`
                }
              />
            ) : null}
            {data.viewer.fiduBalance ||
            data.seniorPoolStakedPositions.length > 0 ? (
              <ExpandableHoldings
                title="Goldfinch Senior Pool"
                tooltip="Your investment in the Goldfinch Senior Pool. This is quantified by a token called FIDU."
                color="#00ff00"
                holdings={[
                  ...data.seniorPoolStakedPositions.map((stakedPosition) => ({
                    name: "Staked Senior Pool Position",
                    percentage: 0,
                    quantity: stakedPosition.amount,
                    usdcValue: sharesToUsdc(
                      stakedPosition.amount,
                      data.seniorPools[0].latestPoolStatus.sharePrice
                    ),
                    url: "/pools/senior",
                  })),
                  ...(data.viewer.fiduBalance
                    ? [
                        {
                          name: "Unstaked Senior Pool Position",
                          percentage: 0,
                          quantity: data.viewer.fiduBalance.amount,
                          usdcValue: sharesToUsdc(
                            data.viewer.fiduBalance.amount,
                            data.seniorPools[0].latestPoolStatus.sharePrice
                          ),
                          url: "/pools/senior",
                        },
                      ]
                    : []),
                ]}
                quantityFormatter={(n: BigNumber) =>
                  formatCrypto(
                    { amount: n, token: SupportedCrypto.Fidu },
                    { includeToken: true }
                  )
                }
              />
            ) : null}
            {data.viewer.curveLpBalance ? (
              <ExpandableHoldings
                title="Curve Liquidity Provider"
                tooltip="Tokens earned from providing liquidity on the Goldfinch FIDU/USDC pool on Curve."
                color="#0000ff"
                holdings={[
                  {
                    name: "Unstaked LP Tokens",
                    percentage: 0,
                    quantity: data.viewer.curveLpBalance.amount,
                    usdcValue: curveLpTokensToUsdc(
                      data.viewer.curveLpBalance.amount,
                      data.curvePool.usdcPerLpToken
                    ),
                    url: "/stake",
                  },
                ]}
                quantityFormatter={(n: BigNumber) =>
                  formatCrypto(
                    { token: SupportedCrypto.CurveLp, amount: n },
                    { includeToken: true }
                  )
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function curveLpTokensToUsdc(
  lpTokens: BigNumber,
  usdPerCurveLpToken: FixedNumber
) {
  const usdcValue = usdPerCurveLpToken
    .mulUnsafe(FixedNumber.from(lpTokens))
    .round();
  return {
    amount: BigNumber.from(usdcValue.toString().split(".")[0]),
    token: SupportedCrypto.Usdc,
  };
}
