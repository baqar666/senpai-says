// Re-export the native module. On web, it will be resolved to RingtoneSetterModule.web.ts
// and on native platforms to RingtoneSetterModule.ts
export { default } from './src/RingtoneSetterModule';
export * from './src/RingtoneSetter.types';
