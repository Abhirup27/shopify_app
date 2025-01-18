import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsUrl,
  IsDateString,
  IsOptional,
  IsArray,
  IsIn,
  ValidateNested,
  Length,
  Matches,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateShopDTO {

@IsNumber()
@IsNotEmpty()
@Min(1)
    id: number;
    
@IsString()
@Length(1, 255)
    name: string;
    
@IsEmail()
@IsNotEmpty()
    email: string;
    
@IsString()
@IsNotEmpty()
//@Matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
    domain: string;
    
@IsOptional()
@IsString()
    province: string | null;
    
@IsString()
@Length(2, 2)
    country: string;
    
@IsOptional()
@IsString()
    address1: string | null;
    
@IsOptional()
@IsString()
    zip: string | null;

@IsOptional()
@IsString()
    city: string | null;

@IsOptional()
@IsString()
    source: string | null;

@IsOptional()
@IsString()
    phone: string | null;

@IsOptional()
@IsNumber()
    latitude: number | null;

@IsOptional()
@IsNumber()
    longitude: number | null;

@IsString()
@Length(2, 5)
    primary_locale: string;

@IsOptional()
@IsString()
    address2: string | null;

@IsDateString()
    created_at: string;

@IsDateString()
    updated_at: string;

@IsString()
@Length(2, 2)
    country_code: string;

@IsString()
    country_name: string;

@IsString()
@Length(3, 3)
    currency: string;

@IsEmail()
    customer_email: string;

@IsString()
    timezone: string;

@IsString()
    iana_timezone: string;

@IsString()
    shop_owner: string;

@IsString()
    money_format: string;

@IsString()
    money_with_currency_format: string;

@IsString()
@IsIn(['kg', 'g', 'lbs', 'oz'])
    weight_unit: string;

@IsOptional()
@IsString()
    province_code: string | null;

@IsBoolean()
    taxes_included: boolean;

@IsOptional()
@IsBoolean()
    auto_configure_tax_inclusivity: boolean | null;

@IsOptional()
@IsBoolean()
    tax_shipping: boolean | null;

@IsBoolean()
    county_taxes: boolean;

@IsString()
    plan_display_name: string;

@IsString()
    plan_name: string;

@IsBoolean()
    has_discounts: boolean;

@IsBoolean()
    has_gift_cards: boolean;

@IsString()
//@Matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
    myshopify_domain: string;

@IsOptional()
@IsString()
    google_apps_domain: string | null;

@IsOptional()
@IsBoolean()
    google_apps_login_enabled: boolean | null;

@IsString()
    money_in_emails_format: string;

@IsString()
    money_with_currency_in_emails_format: string;

@IsBoolean()
    eligible_for_payments: boolean;

@IsBoolean()
    requires_extra_payments_agreement: boolean;

@IsBoolean()
    password_enabled: boolean;

@IsBoolean()
    has_storefront: boolean;

@IsBoolean()
    finances: boolean;

@IsNumber()
@Min(1)
    primary_location_id: number;

@IsBoolean()
    checkout_api_supported: boolean;

@IsBoolean()
    multi_location_enabled: boolean;

@IsBoolean()
    setup_required: boolean;

@IsBoolean()
    pre_launch_enabled: boolean;

@IsArray()
@IsString({ each: true })
@Length(3, 3, { each: true })
    enabled_presentment_currencies: string[];

@IsBoolean()
    marketing_sms_consent_enabled_at_checkout: boolean;

@IsBoolean()
    transactional_sms_disabled: boolean;

}