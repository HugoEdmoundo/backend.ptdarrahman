import { getRawPool } from './db/mysql'

const tables = [
  'dashboard_statistics',
  'notifications',
  'notification_templates',
  'applicant_mpls',
  'mpls_schedules',
  're_registrations',
  'acceptance_letters',
  'applicant_mous',
  'mou_templates',
  'applicant_discounts',
  'discounts',
  'installment_schedules',
  'installment_plans',
  'payment_transactions',
  'invoices',
  'payment_stages',
  'applicant_graduations',
  'graduation_rules',
  'applicant_test_scores',
  'applicant_test_results',
  'applicant_test_sessions',
  'test_sessions',
  'test_parameters',
  'test_types',
  'applicant_documents',
  'document_requirements',
  'applicant_status_histories',
  'applicant_parents',
  'applicant_profiles',
  'applicants',
  'wave_configurations',
  'selection_flow_steps',
  'selection_flows',
  'registration_categories',
  'education_levels',
  'ppdb_waves',
  'ppdb_periods',
  'academic_calendars'
]

async function main() {
  const pool = getRawPool()
  await pool.execute('SET FOREIGN_KEY_CHECKS=0')
  for (const table of tables) {
    try {
      await pool.execute(`DROP TABLE IF EXISTS \`${table}\``)
      console.log(`Dropped ${table}`)
    } catch (e) {
      console.error(`Failed to drop ${table}`, e)
    }
  }
  await pool.execute('SET FOREIGN_KEY_CHECKS=1')
  console.log('Done dropping legacy PPDB tables.')
  process.exit(0)
}

main().catch(console.error)
