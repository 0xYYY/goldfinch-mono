import { utils } from "ethers";
import { useForm } from "react-hook-form";

import { Form, DollarInput, Button } from "@/components/design-system";
import { FIDU_DECIMALS, CURVE_LP_DECIMALS } from "@/constants";
import { useContract } from "@/lib/contracts";
import { formatCrypto } from "@/lib/format";
import { CryptoAmount, StakedPositionType } from "@/lib/graphql/generated";
import {
  approveErc20IfRequired,
  positionTypeToValue,
  getOptimalPositionsToUnstake,
} from "@/lib/pools";
import { toastTransaction } from "@/lib/toast";
import { useWallet } from "@/lib/wallet";

import type { SimpleStakedPosition } from "./index.page";

interface StakeCardFormProps {
  balance: CryptoAmount;
  action: "STAKE" | "UNSTAKE";
  positionType: StakedPositionType;
  positions: SimpleStakedPosition[];
  tokenMask?: string;
  onComplete: () => void;
}

interface StakeForm {
  amount: string;
}

export default function StakeCardForm({
  balance,
  action,
  positionType,
  positions,
  tokenMask,
  onComplete,
}: StakeCardFormProps) {
  const { account, provider } = useWallet();
  const stakingRewardsContract = useContract("StakingRewards");
  const fiduContract = useContract("Fidu");
  const curveContract = useContract("CurveLP");

  const rhfMethods = useForm<StakeForm>();
  const { control, setValue } = rhfMethods;

  const onSubmit = async (data: StakeForm) => {
    if (
      !account ||
      !provider ||
      !stakingRewardsContract ||
      !fiduContract ||
      !curveContract
    ) {
      return;
    }

    const value = utils.parseUnits(
      data.amount,
      positionType === StakedPositionType.Fidu
        ? FIDU_DECIMALS
        : CURVE_LP_DECIMALS
    );

    if (action === "STAKE") {
      await approveErc20IfRequired({
        account,
        spender: stakingRewardsContract.address,
        amount: value,
        erc20Contract:
          positionType === StakedPositionType.Fidu
            ? fiduContract
            : curveContract,
      });
      await toastTransaction({
        transaction: stakingRewardsContract.stake(
          value,
          positionTypeToValue[positionType]
        ),
        pendingPrompt: "Staking transaction submitted",
      });

      onComplete();
    } else if (action === "UNSTAKE") {
      const optimalPositions = getOptimalPositionsToUnstake(positions, value);

      for (const { id, amount } of optimalPositions) {
        await toastTransaction({
          transaction: stakingRewardsContract.unstake(id, amount),
          pendingPrompt: `Unstaking position ID:${id} submitted`,
        });

        onComplete(); // Update the new totals after each unstake
      }
    }
  };

  const handleMax = async () => {
    setValue("amount", formatCrypto(balance, { includeSymbol: false }));
  };

  return (
    <Form rhfMethods={rhfMethods} onSubmit={onSubmit}>
      <div className="flex items-start gap-2">
        <div className="max-w-xl flex-1">
          <DollarInput
            control={control}
            name="amount"
            label={`${action === "STAKE" ? "Stake" : "Unstake"} amount`}
            mask={`amount ${tokenMask ?? balance.token}`}
            rules={{ required: "Required" }}
            textSize="xl"
            labelClassName="!text-sm !mb-3"
            onMaxClick={handleMax}
          />
        </div>

        <Button type="submit" size="xl" className="mt-8 h-[66px] px-12">
          {`${action === "STAKE" ? "Stake" : "Unstake"}`}
        </Button>
      </div>
    </Form>
  );
}
