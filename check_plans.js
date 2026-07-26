const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jtlwllzaxscxqtcoqpll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHdsbHpheHNjeHF0Y29xcGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ2MzE3MCwiZXhwIjoyMDg0MDM5MTcwfQ.grVYoFJlGjO5VUcfAQkd2UGY-10h254SArSYmyzMOaw'
);

async function checkPlans() {
  const { data, error } = await supabase.from('pricing_plans').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPlans();
