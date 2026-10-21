export interface LogRecord {
  notificationId?: string;
  deliveryId?: string;
  topic?: string;
  status?: string;
  attempts?: number;
  errorCode?: string;
}
export type Logger = (record: LogRecord) => void;
export const log: Logger = (record) => {
  process.stdout.write(JSON.stringify(record) + "\n");
};
