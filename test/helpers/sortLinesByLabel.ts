export function sortLinesByLabel(
  labels: string[],
  lines: string[]
): { [label: string]: string[] } {
  const result: { [label: string]: string[] } = { '': [] }
  for (const label of labels) {
    result[label] = []
  }
  const labelPatterns: { [label: string]: RegExp } = {}
  for (const label of labels) {
    labelPatterns[label] = new RegExp(`^${escapeLabelForRegex(label)} +\\| `)
  }
  for (const line of lines) {
    const label = labels.find(label => line.match(labelPatterns[label])) || ''
    result[label].push(line)
  }
  return result
}

function escapeLabelForRegex(input: string): string {
  return input.replace('$', '\\$')
}
