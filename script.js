// Peptide reconstitution calculator
function calc(){
  var pep = parseFloat(document.getElementById('pep').value);   // mg in vial
  var water = parseFloat(document.getElementById('water').value); // mL BAC water
  var dose = parseFloat(document.getElementById('dose').value);  // desired dose in mcg
  var out = document.getElementById('units');
  var vol = document.getElementById('vol');
  if(!pep || !water || !dose){ out.textContent = '--'; vol.textContent = 'Enter all values above'; return; }
  var concMcgPerMl = (pep * 1000) / water;      // mcg per mL
  var mlNeeded = dose / concMcgPerMl;           // mL for the dose
  var iu = mlNeeded * 100;                       // insulin syringe units (100 IU = 1 mL)
  out.textContent = iu.toFixed(1) + ' IU';
  vol.textContent = 'Draw to ' + iu.toFixed(1) + ' units on a U-100 insulin syringe (' + mlNeeded.toFixed(3) + ' mL). Concentration: ' + concMcgPerMl.toFixed(0) + ' mcg/mL.';
}

// FAQ accordion
document.addEventListener('click', function(e){
  var q = e.target.closest('.q');
  if(q){ q.parentElement.classList.toggle('open'); }
});

// Contact form (client-side only, no data sent)
function submitForm(e){
  e.preventDefault();
  document.querySelector('.form-msg').style.display = 'block';
  e.target.reset();
  return false;
}

// Recalculate on input
window.addEventListener('DOMContentLoaded', function(){
  ['pep','water','dose'].forEach(function(id){
    document.getElementById(id).addEventListener('input', calc);
  });
  calc();
});
