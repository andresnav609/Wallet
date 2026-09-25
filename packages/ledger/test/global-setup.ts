import { prepareTestTemplate } from '@wallet/db/testing';

export default async function setup(): Promise<void> {
  await prepareTestTemplate();
}
