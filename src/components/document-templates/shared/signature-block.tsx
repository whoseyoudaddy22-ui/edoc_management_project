import { TITLE_PREFIX_LABELS } from "@/lib/labels";
import type { TitlePrefix } from "@/generated/prisma/enums";

export function SignatureBlock({
  signerTitlePrefix,
  signerName,
  signerPosition,
  sender,
  showSender,
}: {
  signerTitlePrefix: TitlePrefix | null;
  signerName: string | null;
  signerPosition: string | null;
  sender: string;
  showSender: boolean;
}) {
  const fullSignerName = signerName
    ? `${signerTitlePrefix ? TITLE_PREFIX_LABELS[signerTitlePrefix] : ""}${signerName}`
    : null;

  return (
    <div className="mt-16 ml-auto w-[7cm] text-center text-[16pt]">
      <p className="mb-16">ลงชื่อ .......................................................</p>
      {fullSignerName && <p>({fullSignerName})</p>}
      {signerPosition && <p>{signerPosition}</p>}
      {showSender && <p>จาก {sender}</p>}
    </div>
  );
}
