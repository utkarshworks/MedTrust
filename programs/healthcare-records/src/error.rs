use anchor_lang::prelude::*;

#[error_code]
pub enum HealthcareError {
    #[msg("Consent expiry must be in the future.")]
    InvalidExpiry,

    #[msg("Consent has been revoked.")]
    ConsentRevoked,

    #[msg("Consent has expired.")]
    ConsentExpired,

    #[msg("Provider is not authorized.")]
    InvalidProvider,
}
