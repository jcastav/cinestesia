import type { SourceSummary } from "@cinestesia/shared";
import type { SourceRow } from "../db/schema";

export function toSourceSummary(row: SourceRow): SourceSummary {
  const isHls = row.playbackUrl.includes(".m3u8");
  return {
    id: row.id,
    availability: row.isActive ? "active" : "unavailable",
    protocols: isHls ? ["HLS"] : [],
  };
}
