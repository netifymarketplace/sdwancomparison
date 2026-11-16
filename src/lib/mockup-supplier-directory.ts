/** Owner-approved temporary contacts. These never modify original research or prove supplier authority. */
import {TEST_MAIL_DESTINATION} from './procurement-foundation';
export const MOCKUP_SUPPLIER_CONTACT={email:TEST_MAIL_DESTINATION,phone:'07590212100',telephoneUri:'tel:+447590212100',kind:'netify_internal_test_contact',marketplaceParticipation:'not_onboarded',supplierConfirmed:false,notice:'Temporary Netify test contact. Supplier onboarding remains outstanding.'} as const;
export function mockupSupplierDirectory(records:{provider:{slug:string;display_name:string}}[]){return records.map(record=>({supplierId:record.provider.slug,name:record.provider.display_name,profile:'researched',availableInMockup:true,contact:MOCKUP_SUPPLIER_CONTACT}));}
