# -*- coding: utf-8 -*-
"""
Created on Fri Nov 12 15:51:52 2021

@authors: Maxim Filimonov, Irena Spasic (School of Computer Science & Informatics, Cardiff University, Cardiff, CF24 4AG, UK)
@contact information: spasici@cardiff.ac.uk, filimonovm@cardiff.ac.uk
"""

from cmath import inf
import json
import os
import argparse
import random
import re
import inflect # library for correct generation of plurals (https://pypi.org/project/inflect/)

# define multiple simultaneous replacement functions
def multiple_replacer(*key_values):
    replace_dict = dict(key_values)
    replacement_function = lambda match: replace_dict[match.group(0)]
    pattern = re.compile("|".join([re.escape(k) for k, v in key_values]), re.M)
    return lambda string: pattern.sub(replacement_function, string)

def multiple_replace(string, *key_values):
    return multiple_replacer(*key_values)(string)

# set command line arguments
parser = argparse.ArgumentParser(description='Randomise acronyms and longforms in corpus JSON file')
parser.add_argument('-i', '--input', metavar="input", type=str, required=True, help='Path to the input JSON file')
parser.add_argument('-o', '--output', metavar="output", type=str, required=True, help='Path to the output JSON file')
parser.add_argument('-t', '--threshold', metavar="threshold", type=int, required=False, default=50, help='Probability of replacement. The higher it is the more longforms will be in the processed corpus. Default value is 50%')
args = parser.parse_args()

# read arguments from the command line
input_path = args.input
output_path = args.output
threshold = args.threshold # that is 50 by default if not provided

# initialise inflect plural engine
p = inflect.engine()

# read json file
f = open(os.path.join(os.getcwd(), input_path), encoding="utf8")

# get JSON object as a dictionary
data = json.load(f)

# construct output json data
processed_data = {"documents": []}

# cycle through the json list
for abstract in data['abstracts']:
    document = abstract['edited_abstract']

    # cycle through each acronym in acronyms for current abstract
    for acronym in abstract['acronyms']:

        # get uniform random value from 0 to 100
        coin = random.uniform(0, 100)

        # define acronym-sense construct from processed abstract for both singular and plural (based on processed abstract from web application)
        acronymsenseconstruct_singular = "<acronym shortform='" + acronym['shortform'] + "' longform='" + acronym['longform'] + "'>" + acronym['shortform'] + "</acronym>"
        acronymsenseconstruct_plural = "<acronym shortform='" + acronym['shortform'] + "' longform='" + acronym['longform'] + "'>" + acronym['shortform'] + "s</acronym>"
        
        # define correct longform for plural using inflect pluralise engine
        longform_plural = acronym['longform'].split(' ')
        longform_plural[len(longform_plural) - 1] = p.plural(longform_plural[len(longform_plural) - 1])
        longform_plural = ' '.join(longform_plural)

        # cycle through each sentence in the document with index so that change is possible
        if coin < threshold:
            acronym["form"] = "short" # resulting form for particular acronym
            # define replacements dictionary for both singular and plural
            replacements = (acronymsenseconstruct_singular, acronym['shortform']), (acronymsenseconstruct_plural, acronym['shortform'] + "s")
            for i in range(len(document)):
                document[i] = multiple_replace(document[i], *replacements)
        else:
            acronym["form"] = "long" # resulting form for particular acronym
            # define replacements dictionary for both singular and plural
            replacements = (acronymsenseconstruct_singular, acronym['longform']), (acronymsenseconstruct_plural, longform_plural)
            for i in range(len(document)):
                document[i] = multiple_replace(document[i], *replacements)

    # append processed data
    processed_data['documents'].append({
        "pubmed_id": abstract['pubmed_id'],
        "document": document,
        "acronyms": abstract['acronyms']
    })

# pretty-write processed data into result file
with open(os.path.join(os.getcwd(), output_path), 'w') as outfile:
    json.dump(processed_data, outfile, indent = 4)

# close file
f.close()

