/**
 * The PDF chart's font bytes from the app bundle (expo-asset), loaded
 * once, and what is built on them: the measurer, the page, and the
 * finished PDF.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { FontKey, Page, PageInput } from './pdf/layout';
import { layoutPage } from './pdf/layout';
import { FontBytes, makeMeasure } from './pdf/fonts';
import type { Measure } from './pdf/layout';
import { writePdf } from './pdf/pdf';

const MODULES: Record<FontKey, number> = {
  regular: require('../assets/fonts/ArchivoTab-Regular.ttf'),
  medium: require('../assets/fonts/ArchivoTab-Medium.ttf'),
  bold: require('../assets/fonts/ArchivoTab-Bold.ttf'),
};

export interface PageKit {
  bytes: FontBytes;
  measure: Measure;
}

let loading: Promise<PageKit> | null = null;

async function load(): Promise<PageKit> {
  const bytes = {} as FontBytes;
  for (const k of Object.keys(MODULES) as FontKey[]) {
    const asset = Asset.fromModule(MODULES[k]);
    await asset.downloadAsync();
    bytes[k] = await new File(asset.localUri ?? asset.uri).bytes();
  }
  return { bytes, measure: makeMeasure(bytes) };
}

/** Fonts for laying out and writing the PDF chart, loaded on first use. */
export function pageKit(): Promise<PageKit> {
  if (!loading) {
    loading = load().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export function chartPage(kit: PageKit, input: PageInput): Page {
  return layoutPage(kit.measure, input);
}

export function chartPdf(kit: PageKit, page: Page): Promise<Uint8Array> {
  return writePdf([page], kit.bytes, { title: 'Air pressure', subject: 'Barometer readings and notes' });
}
