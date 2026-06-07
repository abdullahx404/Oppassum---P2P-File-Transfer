export type HealthPayload = {
  status: "ok";
  service: "oppassum-signaling";
};

export function createHealthPayload(): HealthPayload {
  return {
    status: "ok",
    service: "oppassum-signaling"
  };
}
