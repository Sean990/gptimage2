import { readonly, ref } from 'vue'
import {
  assets as fallbackAssets,
  faqItems as fallbackFaqItems,
  features as fallbackFeatures,
  homeImages as fallbackHomeImages,
  legalSections as fallbackLegalSections,
  pricingModes as fallbackPricingModes,
  showcaseItems as fallbackShowcaseItems,
} from '../data/siteData'
import { api } from './api'

const SHOP_URL = 'https://pay.ldxp.cn/shop/imgsgen'

function injectBuyUrl(pricingModes) {
  if (!pricingModes) return pricingModes
  const result = {}
  for (const [key, mode] of Object.entries(pricingModes)) {
    result[key] = {
      ...mode,
      plans: (mode.plans || []).map((plan) => ({
        ...plan,
        buyUrl: plan.buyUrl || SHOP_URL,
      })),
    }
  }
  return result
}

const fallbackSiteData = {
  assets: fallbackAssets,
  homeImages: fallbackHomeImages,
  features: fallbackFeatures,
  faqItems: fallbackFaqItems,
  billingEnabled: false,
  pricingModes: fallbackPricingModes,
  usageCosts: null,
  rewardCredits: null,
  showcaseItems: fallbackShowcaseItems,
  legalSections: fallbackLegalSections,
}

const siteData = ref(fallbackSiteData)
const loading = ref(false)
const error = ref('')
let loadingPromise = null

export function useSiteStore() {
  async function loadSiteData() {
    if (loadingPromise) return loadingPromise

    loading.value = true
    error.value = ''
    loadingPromise = api
      .getSite()
      .then((data) => {
        siteData.value = {
          ...fallbackSiteData,
          ...data,
          pricingModes: injectBuyUrl(data.pricingModes || fallbackPricingModes),
        }
        return siteData.value
      })
      .catch((requestError) => {
        error.value = requestError.message
        return siteData.value
      })
      .finally(() => {
        loading.value = false
        loadingPromise = null
      })

    return loadingPromise
  }

  return {
    siteData: readonly(siteData),
    loading: readonly(loading),
    error: readonly(error),
    loadSiteData,
  }
}
