use wasm_bindgen::prelude::*;
use ndarray::prelude::*;
use std::collections::HashMap;
use itertools::izip;

#[wasm_bindgen]
pub struct ApotheosisSolverRS {
    tag_magnitude: f64,
    color_weight: f64,
    samey_punishment: f64,
    num_properties: usize,
    // ids: Vec<i32>,
    id_to_index: std::collections::HashMap<i32, usize>,
    stack_sizes: Array1<i32>,
    energies: Array1<f64>,
    // biases: Array1<f64>,
    // mood_vectors: Array2<f64>,
    weighted_mood_vectors: Array2<f64>,
    color_vectors: Array2<f64>,
    tag_bitsets: Array1<u32>, 
    output_tag_bitsets: Array1<u32>,
    fuseable_ids: Vec<i32>,
    id_to_fuseable_index: HashMap<i32, usize>,
    fuseable_mood_vectors: Array2<f64>,
    fuseable_color_vectors: Array2<f64>,
    fuseable_tag_bitsets: Array1<u32>,
    fuseable_biases: Array1<f64>,
}

#[wasm_bindgen]
impl ApotheosisSolverRS {
    #[wasm_bindgen(constructor)]
    pub fn new(
        property_weights: Vec<f64>,
        tag_magnitude: f64,
        color_weight: f64,
        samey_punishment: f64,
        ids: Vec<i32>,
        stack_sizes: Vec<i32>,
        energies: Vec<f64>,
        biases: Vec<f64>,
        flattened_mood_vectors: Vec<f64>,
        flattened_color_vectors: Vec<f64>,
        tag_bitsets: Vec<u32>,
        output_tag_bitsets: Vec<u32>,
        fuseable_ids: Vec<i32>
    ) -> Result<ApotheosisSolverRS, JsError> {
        let num_items = ids.len();
        let num_properties = property_weights.len();

        if energies.len() != num_items {
            return Err(JsError::new("energies.len() must equal item_ids.len()"));
        }
        if biases.len() != num_items {
            return Err(JsError::new("biases.len() must equal item_ids.len()"));
        }
        if flattened_mood_vectors.len() != num_items * num_properties {
            return Err(JsError::new("flattened_mood_vectors.len() must equal item_ids.len() * property_weights.len()"));
        }
        if flattened_color_vectors.len() != num_items * 3 {
            return Err(JsError::new("flattened_color_vectors.len() must equal 3 * item_ids.len()"));
        }
        if tag_bitsets.len() != num_items {
            return Err(JsError::new("tag_bitsets.len() must equal item_ids.len()"));
        }
        if output_tag_bitsets.len() != num_items {
            return Err(JsError::new("output_tag_bitsets.len() must equal item_ids.len()"));
        }

        let id_to_index = ids
            .iter()
            .enumerate()
            .map(|(i, &id)| (id, i))
            .collect::<HashMap<_, _>>();

        let energies = Array1::from_shape_vec(num_items, energies)
            .map_err(|_| JsError::new("Failed to create energies array"))?;
        let stack_sizes = Array1::from_shape_vec(num_items, stack_sizes)
            .map_err(|_| JsError::new("Failed to create stack_sizes array"))?;
        let biases = Array1::from_shape_vec(num_items, biases)
            .map_err(|_| JsError::new("Failed to create biases array"))?;

        let mood_vectors = Array2::from_shape_vec((num_items, num_properties), flattened_mood_vectors)
            .map_err(|_| JsError::new("Failed to create item_mood_vectors array"))?;
        let weighted_mood_vectors = &mood_vectors * Array1::from(property_weights);
        let color_vectors = Array2::from_shape_vec((num_items, 3), flattened_color_vectors)
            .map_err(|_| JsError::new("Failed to create item_color_vectors array"))?;
        let tag_bitsets = Array1::from_shape_vec(num_items, tag_bitsets)
            .map_err(|_| JsError::new("Failed to create item_tag_bitsets array"))?;
        let output_tag_bitsets = Array1::from_shape_vec(num_items, output_tag_bitsets)
            .map_err(|_| JsError::new("Failed to create item_output_tag_bitsets array"))?;

        let fuseable_idxs = fuseable_ids.iter().map(
            |id| id_to_index.get(id).copied().ok_or_else(|| JsError::new("Fuseable ID not found in item IDs"))
        ).collect::<Result<Vec<_>, _>>()?;
        let id_to_fuseable_index = fuseable_ids
            .iter()
            .enumerate()
            .map(|(i, &id)| (id, i))
            .collect::<HashMap<_, _>>();

        let fuseable_mood_vectors = mood_vectors.select(
            Axis(0),
            &fuseable_idxs
        );
        let fuseable_color_vectors = color_vectors.select(
            Axis(0),
            &fuseable_idxs
        );
        let fuseable_tag_bitsets = tag_bitsets.select(
            Axis(0),
            &fuseable_idxs
        );
        let fuseable_biases = biases.select(
            Axis(0),
            &fuseable_idxs
        ).mapv(|b| 2.5 * b);

        Ok(ApotheosisSolverRS {
            tag_magnitude,
            color_weight,
            samey_punishment,
            num_properties,
            // ids,
            id_to_index,
            stack_sizes,
            energies,
            // biases,
            // mood_vectors,
            weighted_mood_vectors,
            color_vectors,
            tag_bitsets,
            output_tag_bitsets,
            fuseable_ids,
            id_to_fuseable_index,
            fuseable_mood_vectors,
            fuseable_color_vectors,
            fuseable_tag_bitsets,
            fuseable_biases,
        })
    }

    #[wasm_bindgen]
    /// Requires deduplicated items
    pub fn fuse_batch(&self, ids: Vec<i32>, counts: Vec<i32>, sample_sizes: Vec<usize>) -> Result<Vec<i32>, JsError> {
        if self.fuseable_ids.is_empty() {
            return Err(JsError::new("No fuseable items available"));
        }

        let total_input_size = sample_sizes.iter().sum();
        if ids.len() != total_input_size {
            return Err(JsError::new("ids.len() must equal sum of sample_sizes"));
        }
        if counts.len() != total_input_size {
            return Err(JsError::new("counts.len() must equal sum of sample_sizes"));
        }
        for size in &sample_sizes {
            if *size < 2 {
                return Err(JsError::new("sample_sizes must all be at least 2"));
            }
        }

        let batch_size = sample_sizes.len();

        let mut batch_total_energies: Vec<f64> = vec![0.0; batch_size];
        let mut batch_mood_vectors: Array2<f64> = Array2::zeros((batch_size, self.num_properties));
        let mut batch_color_vectors: Array2<f64> = Array2::zeros((batch_size, 3));
        let mut batch_tag_bitsets: Array1<u32> = Array1::zeros(batch_size);
        let mut batch_output_tag_bitsets: Array1<u32> = Array1::zeros(batch_size);
        let mut batch_samey_punishments: Array2<f64> = Array2::zeros((batch_size, self.fuseable_ids.len()));
        
        let mut input_ptr: usize = 0;
        for i in 0..batch_size {
            // Get the indices and counts for the current sample
            let sample_ids = &ids[input_ptr..input_ptr + sample_sizes[i]];
            let sample_idxs = sample_ids.iter()
                .map(|&id| self.id_to_index.get(&id).copied().ok_or_else(|| JsError::new("ID not found in item IDs")))
                .collect::<Result<Vec<_>, _>>()?;
            let sample_counts = &counts[input_ptr..input_ptr + sample_sizes[i]];
            input_ptr += sample_sizes[i];
            
            // Compute combined sample properties
            let sample_total_energy = sample_idxs.iter().zip(sample_counts).map(
                |(&idx, &count)| self.energies[idx] * count as f64
            ).sum::<f64>();
            let sample_total_energy = if sample_total_energy <= 0.0 { 0.01 } else { sample_total_energy };
            batch_total_energies[i] = sample_total_energy;
            for (&id, idx, &count) in izip!(sample_ids, sample_idxs, sample_counts) {
                let energy_fraction = self.energies[idx] * count as f64 / sample_total_energy;
                batch_mood_vectors.row_mut(i).scaled_add(energy_fraction, &self.weighted_mood_vectors.row(idx));
                batch_color_vectors.row_mut(i).scaled_add(energy_fraction, &self.color_vectors.row(idx));
                batch_tag_bitsets[i] |= self.tag_bitsets[idx];
                batch_output_tag_bitsets[i] |= self.output_tag_bitsets[idx];
                if let Some(&fuseable_idx) = self.id_to_fuseable_index.get(&id) {
                    batch_samey_punishments[[i, fuseable_idx]] += self.samey_punishment;
                }
            }
        }

        // Compute distances and find best matches
        let batch_mood_distances = euclidean_distances(&batch_mood_vectors, &self.fuseable_mood_vectors);
        let batch_color_distances = euclidean_distances(&batch_color_vectors, &self.fuseable_color_vectors);
        let batch_tag_similarities = tag_similarities(&batch_tag_bitsets, &self.fuseable_tag_bitsets);
        let batch_output_tag_similarities = tag_similarities(&batch_output_tag_bitsets, &self.fuseable_tag_bitsets);
        let batch_biases = &self.fuseable_biases.clone().insert_axis(Axis(0));

        let batch_distances =
            batch_mood_distances
            + batch_color_distances * self.color_weight
            - batch_tag_similarities.mapv(|x| x * self.tag_magnitude)
            - batch_output_tag_similarities.mapv(|x| x * 1000.0)
            - batch_biases
            + batch_samey_punishments;

        let batch_distances_argmin = batch_distances.map_axis(Axis(1), |row| {
            row.iter()
                .enumerate()
                .min_by(|a, b| a.1.total_cmp(b.1))
                .map(|(idx, _)| idx)
                .unwrap()
        });
        let output_ids: Vec<i32> = batch_distances_argmin.iter().map(|&idx| self.fuseable_ids[idx]).collect();

        // Determine counts
        let output_counts: Vec<i32> = output_ids.iter()
            .zip(batch_total_energies)
            .map(|(&id, total_energy)| {
                let energy = self.energies[self.id_to_index[&id]];
                let stack_size = self.stack_sizes[self.id_to_index[&id]];
                ((total_energy / energy).round() as i32).clamp(1, stack_size)
            })
            .collect();

        Ok(output_ids.into_iter().chain(output_counts).collect())
    }
}

pub fn euclidean_distances(a: &Array2<f64>, b: &Array2<f64>) -> Array2<f64> {
    let a_squared = a.mapv(|x| x * x).sum_axis(Axis(1)).insert_axis(Axis(1));
    let b_squared = b.mapv(|x| x * x).sum_axis(Axis(1)).insert_axis(Axis(0));
    let cross_term = a.dot(&b.t());
    (a_squared + b_squared - 2.0 * cross_term).mapv(|x| x.max(0.0).sqrt())
}

pub fn tag_similarities(a: &Array1<u32>, b: &Array1<u32>) -> Array2<f64> {
    Array2::from_shape_fn((a.len(), b.len()), |(i, j)| (a[i] & b[j]).count_ones() as f64)
}
