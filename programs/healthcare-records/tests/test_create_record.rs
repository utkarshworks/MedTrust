use anchor_lang::{
    AccountDeserialize,
    InstructionData,
    ToAccountMetas,
};
use anchor_lang::prelude::{system_program, Pubkey};
use healthcare_records::state::Record;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

#[test]
fn test_create_record() {
    let mut svm = LiteSVM::new();

    let program_bytes = include_bytes!(
        "../../../target/deploy/healthcare_records.so"
    );

    svm.add_program(healthcare_records::ID, program_bytes).unwrap();

    let patient = Keypair::new();
    let provider = Keypair::new();

    svm.airdrop(&patient.pubkey(), 2_000_000_000).unwrap();

    let record_id: u64 = 1;
    let record_hash = [7u8; 32];

    let (record_pda, _) = Pubkey::find_program_address(
        &[
            healthcare_records::constants::RECORD_SEED,
            patient.pubkey().as_ref(),
            &record_id.to_le_bytes(),
        ],
        &healthcare_records::ID,
    );

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: healthcare_records::ID,
        accounts: healthcare_records::accounts::CreateRecord {
            record: record_pda,
            patient: patient.pubkey(),
            provider: provider.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: healthcare_records::instruction::CreateRecord {
            record_id,
            record_hash,
        }
        .data(),
    };

    let message = Message::new(&[instruction], Some(&patient.pubkey()));

    let mut transaction = Transaction::new_unsigned(message);
    transaction.sign(&[&patient], svm.latest_blockhash());

    svm.send_transaction(transaction).unwrap();

    let account = svm.get_account(&record_pda).unwrap();

    let mut data: &[u8] = &account.data;
    let record = Record::try_deserialize(&mut data).unwrap();

    assert_eq!(record.patient, patient.pubkey());
    assert_eq!(record.provider, provider.pubkey());
    assert_eq!(record.record_id, record_id);
    assert_eq!(record.record_hash, record_hash);
    assert!(record.created_at >= 0);
}
