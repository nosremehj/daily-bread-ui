import type { Translation } from '@jsverse/transloco';

import authEn from '../../../assets/i18n/auth/en.json';
import bibleEn from '../../../assets/i18n/bible/en.json';
import commonEn from '../../../assets/i18n/common/en.json';
import homeEn from '../../../assets/i18n/home/en.json';
import modalsEn from '../../../assets/i18n/modals/en.json';
import profileEn from '../../../assets/i18n/profile/en.json';
import readingPlansEn from '../../../assets/i18n/reading-plans/en.json';
import statisticsEn from '../../../assets/i18n/statistics/en.json';

import authEs from '../../../assets/i18n/auth/es.json';
import bibleEs from '../../../assets/i18n/bible/es.json';
import commonEs from '../../../assets/i18n/common/es.json';
import homeEs from '../../../assets/i18n/home/es.json';
import modalsEs from '../../../assets/i18n/modals/es.json';
import profileEs from '../../../assets/i18n/profile/es.json';
import readingPlansEs from '../../../assets/i18n/reading-plans/es.json';
import statisticsEs from '../../../assets/i18n/statistics/es.json';

import authPtBR from '../../../assets/i18n/auth/pt-BR.json';
import biblePtBR from '../../../assets/i18n/bible/pt-BR.json';
import commonPtBR from '../../../assets/i18n/common/pt-BR.json';
import homePtBR from '../../../assets/i18n/home/pt-BR.json';
import modalsPtBR from '../../../assets/i18n/modals/pt-BR.json';
import profilePtBR from '../../../assets/i18n/profile/pt-BR.json';
import readingPlansPtBR from '../../../assets/i18n/reading-plans/pt-BR.json';
import statisticsPtBR from '../../../assets/i18n/statistics/pt-BR.json';

function pack(
  common: Translation,
  auth: Translation,
  home: Translation,
  bible: Translation,
  readingPlans: Translation,
  statistics: Translation,
  profile: Translation,
  modals: Translation,
): Translation {
  return {
    common,
    auth,
    home,
    bible,
    'reading-plans': readingPlans,
    statistics,
    profile,
    modals,
  };
}

export const TRANSLATIONS_BY_LANG: Record<string, Translation> = {
  'pt-BR': pack(commonPtBR, authPtBR, homePtBR, biblePtBR, readingPlansPtBR, statisticsPtBR, profilePtBR, modalsPtBR),
  en: pack(commonEn, authEn, homeEn, bibleEn, readingPlansEn, statisticsEn, profileEn, modalsEn),
  es: pack(commonEs, authEs, homeEs, bibleEs, readingPlansEs, statisticsEs, profileEs, modalsEs),
};
