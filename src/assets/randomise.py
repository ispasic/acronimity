# -*- coding: utf-8 -*-
"""
Created on Fri Nov 12 15:51:52 2021

@authors: Maxim Filimonov, Irena Spasic (School of Computer Science & Informatics, Cardiff University, Cardiff, CF24 4AG, UK)
@contact information: spasici@cardiff.ac.uk, filimonovm@cardiff.ac.uk
"""

import json
import os
import sys
import argparse
import random
import re

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
parser.add_argument('input_path', metavar='input_path', type=str, help='Path to the input JSON file')
parser.add_argument('output_path', metavar='output_path', type=str, help='Path to the output JSON file')

args = parser.parse_args()

# read arguments from the command line
input_path = sys.argv[1]
output_path = sys.argv[2]

# read json file
input = os.path.join(os.getcwd(), input_path)
f = open(input, encoding="utf8")

# get JSON object as a dictionary
data = json.load(f)

# construct output json data
processed_data = {"documents": []}

# cycle through the json list
for abstract in data['abstracts']:
    document = abstract['edited_abstract']

    # cycle through each acronym in acronyms for current abstract
    for acronym in abstract['acronyms']:

        # get random value from 0 to 1
        coin = random.randint(0, 1)

        # define acronym sense construct from processed abstract for both singular and plural
        acronymsenseconstruct_singular = "<acronym shortform='" + acronym['shortform'] + "' longform='" + acronym['longform'] + "'>" + acronym['shortform'] + "</acronym>"
        acronymsenseconstruct_plural = "<acronym shortform='" + acronym['shortform'] + "' longform='" + acronym['longform'] + "'>" + acronym['shortform'] + "s</acronym>"

        # cycle through each sentence in the document with index so that change is possible
        if coin == 0:
            acronym["form"] = "short" # resulting form for particular acronym
            # define replacements dictionary for both singular and plural
            replacements = (acronymsenseconstruct_singular, acronym['shortform']), (acronymsenseconstruct_plural, acronym['shortform'] + "s")
            for i in range(len(document)):
                document[i] = multiple_replace(document[i], *replacements)
        else:
            acronym["form"] = "long" # resulting form for particular acronym
            # define replacements dictionary for both singular and plural
            replacements = (acronymsenseconstruct_singular, acronym['longform']), (acronymsenseconstruct_plural, acronym['longform'] + "s")
            for i in range(len(document)):
                document[i] = multiple_replace(document[i], *replacements)

    # append processed data
    processed_data['documents'].append({
        "pubmed_id": abstract['pubmed_id'],
        "document": document,
        "acronyms": abstract['acronyms']
    })

# pretty-write processed data into result file
output = os.path.join(os.getcwd(), output_path)
with open(output, 'w') as outfile:
    json.dump(processed_data, outfile, indent = 4)

# close file
f.close()

