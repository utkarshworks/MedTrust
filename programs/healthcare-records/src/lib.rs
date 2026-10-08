pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh");

#[program]
pub mod healthcare_records {
    use super::*;

    pub fn create_record(
        ctx: Context<CreateRecord>,
        record_id: u64,
        record_hash: [u8; 32],
    ) -> Result<()> {
        crate::instructions::create_record::handle_create_record(
            ctx,
            record_id,
            record_hash,
        )
    }

    pub fn grant_consent(
        ctx: Context<GrantConsent>,
        record_id: u64,
        expires_at: i64,
    ) -> Result<()> {
        crate::instructions::grant_consent::handle_grant_consent(
            ctx,
            record_id,
            expires_at,
        )
    }

    pub fn revoke_consent(
        ctx: Context<RevokeConsent>,
    ) -> Result<()> {
        crate::instructions::revoke_consent::handle_revoke_consent(ctx)
    }

    pub fn verify_access(
        ctx: Context<VerifyAccess>,
    ) -> Result<()> {
        crate::instructions::verify_access::handle_verify_access(ctx)
    }
}
