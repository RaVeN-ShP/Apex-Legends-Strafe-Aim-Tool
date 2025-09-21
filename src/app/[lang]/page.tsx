export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { lang: 'ja' },
    { lang: 'ko' },
    { lang: 'zh' },
    { lang: 'ru' },
  ];
}

export { default } from '../page';


